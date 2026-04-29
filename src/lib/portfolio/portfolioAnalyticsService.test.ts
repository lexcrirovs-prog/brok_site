import { describe, expect, it } from "vitest";
import {
  calculateCommissions,
  calculateDeposits,
  calculateGrossProfit,
  calculateNetProfit,
  calculatePortfolioValue,
  calculateRealizedProfit,
  calculateTaxes,
  calculateUnrealizedProfit,
  calculateWithdrawals,
  calculateXirr,
  type AnalyticsInput,
  type AnalyticsTransaction,
} from "@/lib/portfolio/portfolioAnalyticsService";

const period = {
  startDate: new Date("2026-01-01T00:00:00.000Z"),
  endDate: new Date("2026-12-31T23:59:59.999Z"),
};

let txCounter = 0;

function tx(overrides: Partial<AnalyticsTransaction>): AnalyticsTransaction {
  return {
    id: overrides.id ?? `tx-${txCounter++}`,
    accountId: overrides.accountId ?? "account-1",
    accountName: "Основной",
    brokerId: overrides.brokerId ?? "broker-1",
    brokerName: "Тестовый брокер",
    instrumentId: overrides.instrumentId,
    instrumentTicker: overrides.instrumentTicker,
    instrumentName: overrides.instrumentName,
    instrumentType: overrides.instrumentType,
    currentPrice: overrides.currentPrice,
    date: overrides.date ?? new Date("2026-01-01"),
    operationType: overrides.operationType ?? "BUY",
    quantity: overrides.quantity ?? "0",
    price: overrides.price ?? "0",
    amountGross: overrides.amountGross ?? "0",
    taxAmount: overrides.taxAmount ?? "0",
    commissionAmount: overrides.commissionAmount ?? "0",
    amountNet: overrides.amountNet ?? overrides.amountGross ?? "0",
    accruedInterest: overrides.accruedInterest ?? "0",
    currency: "RUB",
  };
}

describe("portfolioAnalyticsService", () => {
  it("does not treat a buy operation as a loss", () => {
    const input: AnalyticsInput = {
      transactions: [
        tx({ operationType: "DEPOSIT", amountGross: "2000", amountNet: "2000", date: new Date("2026-01-01") }),
        tx({
          instrumentId: "sber",
          instrumentTicker: "SBER",
          instrumentName: "Сбербанк",
          instrumentType: "STOCK",
          operationType: "BUY",
          quantity: "10",
          price: "100",
          amountGross: "1000",
          commissionAmount: "10",
          amountNet: "-1010",
          currentPrice: "120",
          date: new Date("2026-01-02"),
        }),
      ],
    };

    expect(calculateRealizedProfit(input, period).toNumber()).toBe(0);
    expect(calculateUnrealizedProfit(input, period).toNumber()).toBe(200);
    expect(calculateGrossProfit(input, period).toNumber()).toBe(200);
    expect(calculateNetProfit(input, period).toNumber()).toBe(190);
    expect(calculatePortfolioValue(input, period).toNumber()).toBe(2190);
  });

  it("keeps deposits and withdrawals outside profit", () => {
    const input: AnalyticsInput = {
      transactions: [
        tx({ operationType: "DEPOSIT", amountGross: "1000", amountNet: "1000", date: new Date("2026-01-01") }),
        tx({ operationType: "WITHDRAWAL", amountGross: "250", amountNet: "250", date: new Date("2026-02-01") }),
      ],
    };

    expect(calculateGrossProfit(input, period).toNumber()).toBe(0);
    expect(calculateNetProfit(input, period).toNumber()).toBe(0);
    expect(calculateDeposits(input, period).toNumber()).toBe(1000);
    expect(calculateWithdrawals(input, period).toNumber()).toBe(250);
  });

  it("calculates realized profit separately from taxes and commissions", () => {
    const input: AnalyticsInput = {
      transactions: [
        tx({
          instrumentId: "lkoh",
          instrumentTicker: "LKOH",
          instrumentName: "Лукойл",
          instrumentType: "STOCK",
          operationType: "BUY",
          quantity: "10",
          price: "100",
          amountGross: "1000",
          commissionAmount: "10",
          currentPrice: "100",
          date: new Date("2025-12-20"),
        }),
        tx({
          instrumentId: "lkoh",
          instrumentTicker: "LKOH",
          instrumentName: "Лукойл",
          instrumentType: "STOCK",
          operationType: "SELL",
          quantity: "4",
          price: "130",
          amountGross: "520",
          taxAmount: "10",
          commissionAmount: "5",
          amountNet: "505",
          currentPrice: "100",
          date: new Date("2026-03-01"),
        }),
      ],
    };

    expect(calculateRealizedProfit(input, period).toNumber()).toBe(120);
    expect(calculateTaxes(input, period).toNumber()).toBe(10);
    expect(calculateCommissions(input, period).toNumber()).toBe(5);
    expect(calculateNetProfit(input, period).toNumber()).toBe(105);
  });

  it("returns XIRR when cashflows contain investment and terminal value", () => {
    const input: AnalyticsInput = {
      transactions: [
        tx({ operationType: "DEPOSIT", amountGross: "1000", amountNet: "1000", date: new Date("2026-01-01") }),
        tx({
          instrumentId: "bond",
          instrumentTicker: "OFZ",
          instrumentName: "ОФЗ",
          instrumentType: "BOND",
          operationType: "BUY",
          quantity: "1",
          price: "1000",
          amountGross: "1000",
          currentPrice: "1100",
          date: new Date("2026-01-02"),
        }),
      ],
    };

    expect(calculateXirr(input, period)?.gt(0)).toBe(true);
  });
});
