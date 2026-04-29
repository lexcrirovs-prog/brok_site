import { promises as fs } from "fs";
import path from "path";
import { AccountType, ImportFileStatus, ImportRowStatus, InstrumentType, OperationType, Prisma } from "@prisma/client";
import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { getParser } from "@/lib/import/parserRegistry";
import type { ParsedTransaction } from "@/lib/import/parsers/types";
import { createTransactionFingerprint } from "@/lib/portfolio/fingerprint";

export type NormalizedImportTransaction = {
  accountId: string;
  accountName: string;
  instrumentId: string | null;
  instrumentName: string | null;
  date: string;
  operationType: OperationType;
  quantity: string;
  price: string;
  amountGross: string;
  taxAmount: string;
  commissionAmount: string;
  amountNet: string;
  accruedInterest: string;
  currency: string;
  fingerprint: string;
  duplicate: boolean;
  rawText?: string;
  comment?: string;
};

const statusMap = {
  parsed: ImportFileStatus.PARSED,
  needs_review: ImportFileStatus.NEEDS_REVIEW,
  error: ImportFileStatus.ERROR,
} as const;

function decimalString(value: Decimal.Value | undefined): string {
  return new Decimal(value ?? 0).toDecimalPlaces(8).toString();
}

async function ensureUploadDir(): Promise<string> {
  const uploadDir = path.join(process.cwd(), "storage", "imports");
  await fs.mkdir(uploadDir, { recursive: true });
  return uploadDir;
}

async function resolveAccount(brokerId: string, accountName?: string): Promise<{ id: string; name: string }> {
  const existing = accountName
    ? (await prisma.account.findMany({ where: { brokerId } })).find(
        (account) => account.name.toLocaleLowerCase("ru-RU") === accountName.toLocaleLowerCase("ru-RU"),
      )
    : await prisma.account.findFirst({ where: { brokerId } });

  if (existing) {
    return { id: existing.id, name: existing.name };
  }

  const created = await prisma.account.create({
    data: {
      brokerId,
      name: accountName || "Основной счет",
      currency: "RUB",
      accountType: AccountType.BROKERAGE,
    },
  });

  return { id: created.id, name: created.name };
}

async function resolveInstrument(transaction: ParsedTransaction): Promise<{ id: string; name: string } | null> {
  const instrument = transaction.instrument;

  if (!instrument?.ticker && !instrument?.isin && !instrument?.name) {
    return null;
  }

  const ticker = (instrument.ticker || instrument.isin || instrument.name || "UNKNOWN").toUpperCase();
  const currency = (instrument.currency || transaction.currency || "RUB").toUpperCase();
  const data = {
    ticker,
    isin: instrument.isin || undefined,
    name: instrument.name || ticker,
    type: (instrument.type ?? InstrumentType.OTHER) as InstrumentType,
    currency,
  };

  if (instrument.isin) {
    const record = await prisma.instrument.upsert({
      where: { isin: instrument.isin },
      create: data,
      update: {
        ticker,
        name: data.name,
        type: data.type,
        currency,
      },
    });
    return { id: record.id, name: record.name };
  }

  const record = await prisma.instrument.upsert({
    where: {
      ticker_currency: {
        ticker,
        currency,
      },
    },
    create: data,
    update: {
      name: data.name,
      type: data.type,
    },
  });

  return { id: record.id, name: record.name };
}

async function normalizeParsedTransaction(
  brokerId: string,
  parsed: ParsedTransaction,
): Promise<NormalizedImportTransaction> {
  const account = await resolveAccount(brokerId, parsed.accountName);
  const instrument = await resolveInstrument(parsed);
  const fingerprint = createTransactionFingerprint({
    brokerId,
    accountId: account.id,
    date: parsed.date,
    operationType: parsed.operationType,
    instrumentId: instrument?.id ?? null,
    quantity: parsed.quantity,
    amountGross: parsed.amountGross,
    currency: parsed.currency,
  });
  const duplicate = Boolean(
    await prisma.transaction.findUnique({
      where: { fingerprint },
      select: { id: true },
    }),
  );

  return {
    accountId: account.id,
    accountName: account.name,
    instrumentId: instrument?.id ?? null,
    instrumentName: instrument?.name ?? null,
    date: parsed.date.toISOString(),
    operationType: parsed.operationType as OperationType,
    quantity: decimalString(parsed.quantity),
    price: decimalString(parsed.price),
    amountGross: decimalString(parsed.amountGross),
    taxAmount: decimalString(parsed.taxAmount),
    commissionAmount: decimalString(parsed.commissionAmount),
    amountNet: decimalString(parsed.amountNet),
    accruedInterest: decimalString(parsed.accruedInterest),
    currency: parsed.currency.toUpperCase(),
    fingerprint,
    duplicate,
    rawText: parsed.rawText,
    comment: parsed.comment,
  };
}

function getFileType(file: File): string {
  if (file.type) {
    return file.type;
  }

  const ext = path.extname(file.name).toLowerCase();
  if (ext === ".csv") {
    return "text/csv";
  }
  if (ext === ".xlsx") {
    return "application/vnd.ms-excel";
  }
  if (ext === ".pdf") {
    return "application/pdf";
  }

  return "application/octet-stream";
}

export async function importReportFile(brokerId: string, file: File) {
  const broker = await prisma.broker.findUniqueOrThrow({ where: { id: brokerId } });
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileType = getFileType(file);
  const uploadDir = await ensureUploadDir();
  const storedFileName = `${Date.now()}-${file.name.replace(/[^\w.\-а-яА-ЯёЁ]/g, "_")}`;
  const storagePath = path.join(uploadDir, storedFileName);

  await fs.writeFile(storagePath, buffer);

  const importFile = await prisma.importFile.create({
    data: {
      brokerId,
      fileName: file.name,
      fileType,
      storagePath,
      status: ImportFileStatus.UPLOADED,
    },
  });

  try {
    const parser = getParser(broker.type, fileType, file.name);
    const result = await parser.parse({ buffer, fileName: file.name, fileType });
    const normalizedTransactions: NormalizedImportTransaction[] = [];

    for (const parsed of result.transactions) {
      normalizedTransactions.push(await normalizeParsedTransaction(brokerId, parsed));
    }

    await prisma.importRow.createMany({
      data: (result.rawRows.length > 0 ? result.rawRows : normalizedTransactions).map((row, index) => {
        const normalized = normalizedTransactions[index];
        const rawData = JSON.parse(JSON.stringify(row)) as Prisma.InputJsonValue;
        return {
          importFileId: importFile.id,
          rowIndex: index + 1,
          rawData,
          normalizedData: normalized ? (normalized as unknown as Prisma.InputJsonValue) : undefined,
          status: normalized?.duplicate
            ? ImportRowStatus.DUPLICATE
            : normalized
              ? ImportRowStatus.RECOGNIZED
              : ImportRowStatus.NEEDS_REVIEW,
          warning: result.warnings[index],
        };
      }),
    });

    const finalStatus =
      result.status === "parsed" && normalizedTransactions.some((item) => !item.duplicate)
        ? ImportFileStatus.NEEDS_REVIEW
        : statusMap[result.status];

    const updated = await prisma.importFile.update({
      where: { id: importFile.id },
      data: {
        status: finalStatus,
        detectedPeriodStart: result.detectedPeriodStart,
        detectedPeriodEnd: result.detectedPeriodEnd,
        errorMessage: result.errorMessage ?? (result.warnings.join("; ") || null),
      },
      include: {
        broker: true,
        rows: { orderBy: { rowIndex: "asc" } },
      },
    });

    if (process.env.KEEP_UPLOADED_FILES !== "true") {
      await fs.rm(storagePath, { force: true });
      await prisma.importFile.update({ where: { id: importFile.id }, data: { storagePath: null } });
    }

    return updated;
  } catch (error) {
    return prisma.importFile.update({
      where: { id: importFile.id },
      data: {
        status: ImportFileStatus.ERROR,
        errorMessage: error instanceof Error ? error.message : "Ошибка импорта",
      },
      include: {
        broker: true,
        rows: { orderBy: { rowIndex: "asc" } },
      },
    });
  }
}

export async function confirmImport(importFileId: string) {
  const importRows = await prisma.importRow.findMany({
    where: {
      importFileId,
      status: { in: [ImportRowStatus.RECOGNIZED, ImportRowStatus.NEEDS_REVIEW] },
      normalizedData: { not: Prisma.JsonNull },
    },
    orderBy: { rowIndex: "asc" },
  });

  let created = 0;
  let duplicates = 0;

  for (const row of importRows) {
    const data = row.normalizedData as unknown as NormalizedImportTransaction;

    if (!data?.accountId || !data.fingerprint) {
      await prisma.importRow.update({
        where: { id: row.id },
        data: { status: ImportRowStatus.NEEDS_REVIEW, warning: "Не хватает обязательных полей" },
      });
      continue;
    }

    const duplicate = await prisma.transaction.findUnique({
      where: { fingerprint: data.fingerprint },
      select: { id: true },
    });

    if (duplicate) {
      duplicates += 1;
      await prisma.importRow.update({ where: { id: row.id }, data: { status: ImportRowStatus.DUPLICATE } });
      continue;
    }

    await prisma.transaction.create({
      data: {
        accountId: data.accountId,
        instrumentId: data.instrumentId,
        date: new Date(data.date),
        operationType: data.operationType,
        quantity: data.quantity,
        price: data.price,
        amountGross: data.amountGross,
        taxAmount: data.taxAmount,
        commissionAmount: data.commissionAmount,
        amountNet: data.amountNet,
        accruedInterest: data.accruedInterest,
        currency: data.currency,
        sourceFileId: importFileId,
        rawText: data.rawText,
        comment: data.comment,
        fingerprint: data.fingerprint,
      },
    });

    created += 1;
    await prisma.importRow.update({ where: { id: row.id }, data: { status: ImportRowStatus.CONFIRMED } });
  }

  await prisma.importFile.update({
    where: { id: importFileId },
    data: {
      status: duplicates > 0 && created === 0 ? ImportFileStatus.NEEDS_REVIEW : ImportFileStatus.PARSED,
      errorMessage: duplicates > 0 ? `Найдено дублей: ${duplicates}` : null,
    },
  });

  return { created, duplicates };
}

export async function deleteImport(importFileId: string) {
  const importFile = await prisma.importFile.findUnique({ where: { id: importFileId } });
  if (importFile?.storagePath) {
    await fs.rm(importFile.storagePath, { force: true });
  }

  await prisma.importFile.delete({ where: { id: importFileId } });
}

export async function reprocessImport(importFileId: string) {
  const importFile = await prisma.importFile.findUniqueOrThrow({
    where: { id: importFileId },
    include: { broker: true },
  });

  if (!importFile.storagePath) {
    throw new Error("Файл был удален после парсинга. Загрузите отчет заново.");
  }

  const buffer = await fs.readFile(importFile.storagePath);
  const parser = getParser(importFile.broker.type, importFile.fileType, importFile.fileName);
  const result = await parser.parse({ buffer, fileName: importFile.fileName, fileType: importFile.fileType });
  const normalizedTransactions: NormalizedImportTransaction[] = [];

  for (const parsed of result.transactions) {
    normalizedTransactions.push(await normalizeParsedTransaction(importFile.brokerId, parsed));
  }

  await prisma.importRow.deleteMany({ where: { importFileId } });
  await prisma.importRow.createMany({
    data: (result.rawRows.length > 0 ? result.rawRows : normalizedTransactions).map((row, index) => {
      const normalized = normalizedTransactions[index];
      const rawData = JSON.parse(JSON.stringify(row)) as Prisma.InputJsonValue;
      return {
        importFileId,
        rowIndex: index + 1,
        rawData,
        normalizedData: normalized ? (normalized as unknown as Prisma.InputJsonValue) : undefined,
        status: normalized?.duplicate
          ? ImportRowStatus.DUPLICATE
          : normalized
            ? ImportRowStatus.RECOGNIZED
            : ImportRowStatus.NEEDS_REVIEW,
        warning: result.warnings[index],
      };
    }),
  });

  return prisma.importFile.update({
    where: { id: importFileId },
    data: {
      status: statusMap[result.status],
      detectedPeriodStart: result.detectedPeriodStart,
      detectedPeriodEnd: result.detectedPeriodEnd,
      errorMessage: result.errorMessage ?? (result.warnings.join("; ") || null),
    },
    include: {
      broker: true,
      rows: { orderBy: { rowIndex: "asc" } },
    },
  });
}
