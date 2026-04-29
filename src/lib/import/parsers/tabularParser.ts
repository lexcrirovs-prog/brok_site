import Decimal from "decimal.js";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import type { ParsedInstrument, ParsedTransaction, ParseResult } from "@/lib/import/parsers/types";

type RawRow = Record<string, unknown>;

const aliases = {
  date: ["date", "дата", "дата операции", "дата сделки", "trade date"],
  operationType: ["operation", "тип операции", "операция", "вид операции", "operation type"],
  ticker: ["ticker", "тикер", "код", "symbol"],
  isin: ["isin", "исин"],
  name: ["instrument", "инструмент", "бумага", "название", "актив", "asset"],
  instrumentType: ["тип инструмента", "asset type", "instrument type"],
  accountName: ["account", "счет", "счёт", "broker account"],
  quantity: ["quantity", "qty", "количество", "кол-во"],
  price: ["price", "цена", "цена сделки"],
  amountGross: ["amountgross", "gross", "сумма", "сумма до налогов", "оборот", "amount"],
  taxAmount: ["tax", "налог", "ндфл"],
  commissionAmount: ["commission", "комиссия", "broker commission"],
  amountNet: ["net", "сумма после налогов", "итого", "amountnet"],
  accruedInterest: ["нкд", "aci", "accrued interest"],
  currency: ["currency", "валюта"],
} satisfies Record<string, string[]>;

const operationMap = new Map<string, ParsedTransaction["operationType"]>([
  ["buy", "BUY"],
  ["покупка", "BUY"],
  ["купля", "BUY"],
  ["sell", "SELL"],
  ["продажа", "SELL"],
  ["dividend", "DIVIDEND"],
  ["дивиденд", "DIVIDEND"],
  ["дивиденды", "DIVIDEND"],
  ["coupon", "COUPON"],
  ["купон", "COUPON"],
  ["купоны", "COUPON"],
  ["bond_redemption", "BOND_REDEMPTION"],
  ["погашение", "BOND_REDEMPTION"],
  ["tax", "TAX"],
  ["налог", "TAX"],
  ["commission", "COMMISSION"],
  ["комиссия", "COMMISSION"],
  ["deposit", "DEPOSIT"],
  ["пополнение", "DEPOSIT"],
  ["withdrawal", "WITHDRAWAL"],
  ["вывод", "WITHDRAWAL"],
  ["currency_exchange", "CURRENCY_EXCHANGE"],
  ["обмен валюты", "CURRENCY_EXCHANGE"],
  ["broker_fee", "BROKER_FEE"],
  ["плата брокеру", "BROKER_FEE"],
]);

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function getValue(row: RawRow, key: keyof typeof aliases): unknown {
  const normalizedEntries = Object.entries(row).map(([header, value]) => [normalizeHeader(header), value] as const);
  const match = normalizedEntries.find(([header]) => aliases[key].includes(header));
  return match?.[1];
}

function parseDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return new Date(parsed.y, parsed.m - 1, parsed.d);
    }
  }

  const raw = String(value ?? "").trim();
  if (!raw) {
    return null;
  }

  const ru = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (ru) {
    const year = ru[3].length === 2 ? `20${ru[3]}` : ru[3];
    return new Date(Number(year), Number(ru[2]) - 1, Number(ru[1]));
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDecimal(value: unknown): Decimal {
  const raw = String(value ?? "0")
    .replace(/\s+/g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");

  if (!raw || raw === "-" || raw === ".") {
    return new Decimal(0);
  }

  return new Decimal(raw);
}

function parseOperation(value: unknown): ParsedTransaction["operationType"] {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return operationMap.get(normalized) ?? "OTHER";
}

function parseInstrumentType(value: unknown): ParsedInstrument["type"] {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (["stock", "акция", "акции"].includes(normalized)) {
    return "STOCK";
  }

  if (["bond", "облигация", "облигации"].includes(normalized)) {
    return "BOND";
  }

  if (["fund", "etf", "фонд", "бпиф"].includes(normalized)) {
    return "FUND";
  }

  if (["currency", "валюта"].includes(normalized)) {
    return "CURRENCY";
  }

  return "OTHER";
}

function detectPeriod(transactions: ParsedTransaction[]): Pick<ParseResult, "detectedPeriodStart" | "detectedPeriodEnd"> {
  if (transactions.length === 0) {
    return {};
  }

  const sorted = transactions.map((transaction) => transaction.date).sort((a, b) => a.getTime() - b.getTime());
  return {
    detectedPeriodStart: sorted[0],
    detectedPeriodEnd: sorted[sorted.length - 1],
  };
}

export function parseRowsToTransactions(rows: RawRow[]): ParseResult {
  const transactions: ParsedTransaction[] = [];
  const warnings: string[] = [];

  rows.forEach((row, index) => {
    const date = parseDate(getValue(row, "date"));
    const operationType = parseOperation(getValue(row, "operationType"));
    const currency = String(getValue(row, "currency") ?? "RUB").trim().toUpperCase() || "RUB";
    const amountGross = parseDecimal(getValue(row, "amountGross"));
    const taxAmount = parseDecimal(getValue(row, "taxAmount"));
    const commissionAmount = parseDecimal(getValue(row, "commissionAmount"));
    const amountNetRaw = parseDecimal(getValue(row, "amountNet"));
    const amountNet = amountNetRaw.isZero() ? amountGross.minus(taxAmount).minus(commissionAmount) : amountNetRaw;

    if (!date || operationType === "OTHER") {
      warnings.push(`Строка ${index + 1}: не распознаны дата или тип операции`);
      return;
    }

    transactions.push({
      date,
      accountName: String(getValue(row, "accountName") ?? "").trim() || undefined,
      instrument: {
        ticker: String(getValue(row, "ticker") ?? "").trim() || undefined,
        isin: String(getValue(row, "isin") ?? "").trim() || undefined,
        name: String(getValue(row, "name") ?? "").trim() || undefined,
        type: parseInstrumentType(getValue(row, "instrumentType")),
        currency,
      },
      operationType,
      quantity: parseDecimal(getValue(row, "quantity")),
      price: parseDecimal(getValue(row, "price")),
      amountGross,
      taxAmount,
      commissionAmount,
      amountNet,
      accruedInterest: parseDecimal(getValue(row, "accruedInterest")),
      currency,
      rawText: JSON.stringify(row),
      recognitionStatus: "recognized",
    });
  });

  const status = transactions.length > 0 && warnings.length < rows.length ? "parsed" : "needs_review";

  return {
    status,
    transactions,
    rawRows: rows,
    warnings,
    ...detectPeriod(transactions),
  };
}

export function parseCsv(buffer: Buffer): ParseResult {
  const parsed = Papa.parse<RawRow>(buffer.toString("utf8"), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors.length > 0) {
    return {
      status: "needs_review",
      transactions: [],
      rawRows: parsed.data,
      warnings: parsed.errors.map((error) => error.message),
    };
  }

  return parseRowsToTransactions(parsed.data);
}

export function parseXlsx(buffer: Buffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<RawRow>(firstSheet, { defval: "" });
  return parseRowsToTransactions(rows);
}
