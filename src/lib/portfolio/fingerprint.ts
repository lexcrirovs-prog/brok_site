import { createHash } from "crypto";
import Decimal from "decimal.js";

export type TransactionFingerprintInput = {
  brokerId: string;
  accountId: string;
  date: Date | string;
  operationType: string;
  instrumentId?: string | null;
  quantity?: Decimal.Value | null;
  amountGross?: Decimal.Value | null;
  currency: string;
};

function normalizeDecimal(value: Decimal.Value | null | undefined): string {
  return new Decimal(value ?? 0).toDecimalPlaces(8).toString();
}

export function createTransactionFingerprint(input: TransactionFingerprintInput): string {
  const payload = [
    input.brokerId,
    input.accountId,
    new Date(input.date).toISOString(),
    input.operationType.toLowerCase(),
    input.instrumentId ?? "cash",
    normalizeDecimal(input.quantity),
    normalizeDecimal(input.amountGross),
    input.currency.toUpperCase(),
  ].join("|");

  return createHash("sha256").update(payload).digest("hex");
}
