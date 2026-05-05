import { InstrumentType, PriceSourceType, type Instrument } from "@prisma/client";
import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";

const ISS_BASE_URL = "https://iss.moex.com/iss";
const REQUEST_TIMEOUT_MS = 12_000;

type MoexTable = {
  columns?: string[];
  data?: unknown[][];
};

type MoexRow = Record<string, unknown>;

type SecurityMatch = {
  secId: string;
  boardId?: string;
};

export type MoexPriceUpdateItem = {
  instrumentId: string;
  ticker: string;
  name: string;
  status: "updated" | "skipped" | "error";
  price?: string;
  currency?: string;
  boardId?: string;
  secId?: string;
  pricedAt?: string;
  message?: string;
};

export type MoexPriceUpdateResult = {
  updated: number;
  skipped: number;
  errors: number;
  items: MoexPriceUpdateItem[];
};

function rowsFromTable(table?: MoexTable): MoexRow[] {
  if (!table?.columns || !table.data) {
    return [];
  }

  return table.data.map((row) =>
    Object.fromEntries(table.columns!.map((column, index) => [column.toUpperCase(), row[index]])),
  );
}

function asString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  return value.trim() || undefined;
}

function asDecimal(value: unknown): Decimal | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  try {
    return new Decimal(String(value).replace(",", "."));
  } catch {
    return null;
  }
}

function firstDecimal(row: MoexRow, keys: string[]): { key: string; value: Decimal } | null {
  for (const key of keys) {
    const value = asDecimal(row[key]);
    if (value && value.gt(0)) {
      return { key, value };
    }
  }

  return null;
}

function parseMoexDate(value: unknown): Date {
  const text = asString(value);
  if (!text) {
    return new Date();
  }

  const normalized = text.includes("T") ? text : `${text.replace(" ", "T")}+03:00`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function normalizeCurrency(value: string | undefined, fallback: string): string {
  const currency = (value ?? fallback).toUpperCase();
  return currency === "SUR" || currency === "RUR" ? "RUB" : currency;
}

function marketForType(type: InstrumentType): "shares" | "bonds" | null {
  if (type === InstrumentType.BOND) {
    return "bonds";
  }

  if (type === InstrumentType.STOCK || type === InstrumentType.FUND) {
    return "shares";
  }

  return null;
}

function scoreSecurity(row: MoexRow, instrument: Instrument, market: "shares" | "bonds"): number {
  const secId = asString(row.SECID)?.toUpperCase();
  const isin = asString(row.ISIN)?.toUpperCase();
  const type = asString(row.TYPE)?.toLowerCase() ?? "";
  let score = 0;

  if (instrument.isin && isin === instrument.isin.toUpperCase()) {
    score += 100;
  }
  if (secId === instrument.ticker.toUpperCase()) {
    score += 80;
  }
  if (market === "bonds" && type.includes("bond")) {
    score += 20;
  }
  if (market === "shares" && (type.includes("share") || type.includes("stock") || type.includes("fund"))) {
    score += 20;
  }
  if (asString(row.MARKETPRICE_BOARDID) || asString(row.PRIMARY_BOARDID)) {
    score += 5;
  }

  return score;
}

async function fetchJson(url: string): Promise<Record<string, MoexTable>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      throw new Error(`MOEX ISS HTTP ${response.status}`);
    }

    return (await response.json()) as Record<string, MoexTable>;
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveSecurity(instrument: Instrument, market: "shares" | "bonds"): Promise<SecurityMatch | null> {
  const queries = [instrument.isin, instrument.ticker].filter(Boolean) as string[];

  for (const query of [...new Set(queries)]) {
    const params = new URLSearchParams({
      "iss.meta": "off",
      "iss.only": "securities",
      is_trading: "1",
      q: query,
      "securities.columns": "secid,name,shortname,isin,type,primary_boardid,marketprice_boardid",
    });
    const data = await fetchJson(`${ISS_BASE_URL}/securities.json?${params.toString()}`);
    const rows = rowsFromTable(data.securities);
    const best = rows
      .map((row) => ({ row, score: scoreSecurity(row, instrument, market) }))
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score)[0]?.row;

    const secId = asString(best?.SECID);
    if (secId) {
      return {
        secId,
        boardId: asString(best?.MARKETPRICE_BOARDID) ?? asString(best?.PRIMARY_BOARDID),
      };
    }
  }

  return market === "shares" ? { secId: instrument.ticker.toUpperCase() } : null;
}

function selectBoardRows(
  securities: MoexRow[],
  marketdata: MoexRow[],
  market: "shares" | "bonds",
  preferredBoardId?: string,
) {
  const preferredBoards = [
    preferredBoardId,
    ...(market === "bonds" ? ["TQOB", "TQCB", "TQIR"] : ["TQBR", "TQTF", "TQTD", "TQPI"]),
  ].filter(Boolean) as string[];

  const withPrice = marketdata
    .map((row) => {
      const boardId = asString(row.BOARDID);
      const security = securities.find((item) => asString(item.BOARDID) === boardId);
      const quote = firstDecimal(row, ["LAST", "LCURRENTPRICE", "MARKETPRICE", "CLOSEPRICE", "LEGALCLOSEPRICE", "PREVPRICE"]);
      const boardScore = boardId ? preferredBoards.indexOf(boardId) : -1;
      return {
        row,
        security,
        quote,
        score: (boardScore >= 0 ? 100 - boardScore : 0) + (quote?.key === "LAST" ? 20 : 0),
      };
    })
    .filter((item) => item.quote);

  return withPrice.sort((left, right) => right.score - left.score)[0] ?? null;
}

export function convertMoexQuoteToUnitPrice(rawPrice: Decimal, faceValue: Decimal | null, market: "shares" | "bonds") {
  if (market === "bonds" && faceValue && faceValue.gt(0) && rawPrice.lte(200)) {
    return rawPrice.mul(faceValue).div(100);
  }

  return rawPrice;
}

export async function fetchMoexQuote(instrument: Instrument) {
  const market = marketForType(instrument.type);
  if (!market) {
    throw new Error("MOEX ISS поддерживает автообновление только для акций, фондов и облигаций");
  }

  const security = await resolveSecurity(instrument, market);
  if (!security) {
    throw new Error("Инструмент не найден на Московской бирже");
  }

  const params = new URLSearchParams({
    "iss.meta": "off",
    "iss.only": "securities,marketdata",
    "securities.columns": "SECID,BOARDID,SHORTNAME,FACEVALUE,PREVPRICE,LOTVALUE,LOTSIZE,CURRENCYID",
    "marketdata.columns":
      "SECID,BOARDID,LAST,LCURRENTPRICE,MARKETPRICE,CLOSEPRICE,LEGALCLOSEPRICE,PREVPRICE,FACEVALUE,UPDATETIME,SYSTIME",
  });
  const data = await fetchJson(
    `${ISS_BASE_URL}/engines/stock/markets/${market}/securities/${encodeURIComponent(security.secId)}.json?${params.toString()}`,
  );
  const selected = selectBoardRows(rowsFromTable(data.securities), rowsFromTable(data.marketdata), market, security.boardId);

  if (!selected?.quote) {
    throw new Error("Котировка MOEX ISS не найдена");
  }

  const faceValue = asDecimal(selected.security?.FACEVALUE) ?? asDecimal(selected.row.FACEVALUE) ?? asDecimal(selected.security?.LOTVALUE);
  const unitPrice = convertMoexQuoteToUnitPrice(selected.quote.value, faceValue, market).toDecimalPlaces(6);
  const currency = normalizeCurrency(asString(selected.security?.CURRENCYID), instrument.currency);

  return {
    secId: asString(selected.row.SECID) ?? security.secId,
    boardId: asString(selected.row.BOARDID) ?? security.boardId,
    price: unitPrice.toFixed(6),
    currency,
    pricedAt: parseMoexDate(selected.row.SYSTIME),
  };
}

export async function updateMoexPrices(instrumentIds?: string[]): Promise<MoexPriceUpdateResult> {
  const instruments = await prisma.instrument.findMany({
    where: {
      ...(instrumentIds?.length ? { id: { in: instrumentIds } } : {}),
      type: { in: [InstrumentType.STOCK, InstrumentType.BOND, InstrumentType.FUND] },
    },
    orderBy: { ticker: "asc" },
  });
  const items: MoexPriceUpdateItem[] = [];

  for (const instrument of instruments) {
    try {
      const quote = await fetchMoexQuote(instrument);
      await prisma.instrument.update({
        where: { id: instrument.id },
        data: {
          currentPrice: quote.price,
          currentPriceDate: quote.pricedAt,
          priceUpdates: {
            create: {
              price: quote.price,
              currency: quote.currency,
              source: PriceSourceType.API,
              pricedAt: quote.pricedAt,
            },
          },
        },
      });

      items.push({
        instrumentId: instrument.id,
        ticker: instrument.ticker,
        name: instrument.name,
        status: "updated",
        price: quote.price,
        currency: quote.currency,
        boardId: quote.boardId,
        secId: quote.secId,
        pricedAt: quote.pricedAt.toISOString(),
      });
    } catch (error) {
      items.push({
        instrumentId: instrument.id,
        ticker: instrument.ticker,
        name: instrument.name,
        status: "error",
        message: error instanceof Error ? error.message : "Ошибка MOEX ISS",
      });
    }
  }

  return {
    updated: items.filter((item) => item.status === "updated").length,
    skipped: items.filter((item) => item.status === "skipped").length,
    errors: items.filter((item) => item.status === "error").length,
    items,
  };
}
