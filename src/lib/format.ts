import Decimal from "decimal.js";

export function toDecimal(value: Decimal.Value | null | undefined): Decimal {
  if (value === null || value === undefined || value === "") {
    return new Decimal(0);
  }

  return new Decimal(value);
}

export function roundMoney(value: Decimal.Value, precision = 2): string {
  return toDecimal(value).toDecimalPlaces(precision, Decimal.ROUND_HALF_UP).toFixed(precision);
}

export function toNumber(value: Decimal.Value | null | undefined): number {
  return Number(roundMoney(value ?? 0, 2));
}

export function formatMoney(value: Decimal.Value | null | undefined, currency = "RUB"): string {
  const amount = toNumber(value ?? 0);

  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPercent(value: Decimal.Value | null | undefined): string {
  return `${toDecimal(value ?? 0).mul(100).toDecimalPlaces(2).toString()}%`;
}

export function formatDate(value: Date | string): string {
  return new Intl.DateTimeFormat("ru-RU").format(new Date(value));
}
