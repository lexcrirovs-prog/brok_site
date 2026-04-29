import type Decimal from "decimal.js";

export type ParsedInstrument = {
  ticker?: string | null;
  isin?: string | null;
  name?: string | null;
  type?: "STOCK" | "BOND" | "FUND" | "CURRENCY" | "OTHER";
  currency?: string;
};

export type ParsedTransaction = {
  date: Date;
  accountName?: string;
  instrument?: ParsedInstrument | null;
  operationType:
    | "BUY"
    | "SELL"
    | "DIVIDEND"
    | "COUPON"
    | "BOND_REDEMPTION"
    | "TAX"
    | "COMMISSION"
    | "DEPOSIT"
    | "WITHDRAWAL"
    | "CURRENCY_EXCHANGE"
    | "BROKER_FEE"
    | "OTHER";
  quantity: Decimal.Value;
  price: Decimal.Value;
  amountGross: Decimal.Value;
  taxAmount: Decimal.Value;
  commissionAmount: Decimal.Value;
  amountNet: Decimal.Value;
  accruedInterest?: Decimal.Value;
  currency: string;
  rawText?: string;
  comment?: string;
  recognitionStatus?: "recognized" | "needs_review";
};

export type ParserInput = {
  buffer: Buffer;
  fileName: string;
  fileType: string;
};

export type ParseResult = {
  status: "parsed" | "needs_review" | "error";
  transactions: ParsedTransaction[];
  rawRows: unknown[];
  warnings: string[];
  detectedPeriodStart?: Date;
  detectedPeriodEnd?: Date;
  errorMessage?: string;
};

export interface ReportParser {
  name: string;
  brokerType: "TBANK" | "SBER" | "VTB" | "OTHER";
  supports(fileType: string, fileName: string): boolean;
  parse(input: ParserInput): Promise<ParseResult>;
}
