import type { PortfolioAnalytics } from "@/lib/portfolio/portfolioAnalyticsService";
import { toDecimal, toNumber } from "@/lib/format";

const typeLabels: Record<string, string> = {
  STOCK: "Акции",
  BOND: "Облигации",
  FUND: "Фонды",
  CURRENCY: "Валюта",
  CASH: "Кэш",
  OTHER: "Прочее",
};

export function buildChartData(analytics: PortfolioAnalytics) {
  const monthly = analytics.monthlyProfit.map((item) => ({
    month: item.month,
    profit: toNumber(item.profit),
    dividends: toNumber(item.dividends),
    coupons: toNumber(item.coupons),
    taxes: toNumber(item.taxes),
    commissions: toNumber(item.commissions),
  }));

  return {
    portfolioHistory: analytics.portfolioHistory.map((item) => ({
      date: item.date,
      value: toNumber(item.value),
    })),
    monthlyProfit: monthly,
    monthlyIncome: monthly,
    monthlyCosts: monthly,
    brokerBreakdown: analytics.brokerBreakdown.map((item) => ({
      name: item.brokerName,
      value: toNumber(item.value),
    })),
    assetAllocation: analytics.assetAllocation.map((item) => ({
      type: typeLabels[item.type] ?? item.type,
      value: toNumber(item.value),
      share: toNumber(item.share),
    })),
    topProfit: analytics.instrumentBreakdown
      .filter((item) => item.profit.gte(0))
      .slice(0, 10)
      .map((item) => ({ ticker: item.ticker, profit: toNumber(item.profit) })),
    topLoss: analytics.instrumentBreakdown
      .filter((item) => item.profit.lt(0))
      .sort((a, b) => a.profit.cmp(b.profit))
      .slice(0, 10)
      .map((item) => ({ ticker: item.ticker, profit: toNumber(item.profit) })),
    dividendComparison: [
      { label: "С дивидендами", value: toNumber(analytics.profitWithDividends) },
      { label: "Без дивидендов", value: toNumber(analytics.profitWithoutDividends) },
    ],
    grossNetComparison: [
      { label: "Валовая", value: toNumber(analytics.grossProfit) },
      { label: "Чистая", value: toNumber(analytics.netProfit) },
    ],
  };
}

export function assetShare(analytics: PortfolioAnalytics, type: string): string {
  const item = analytics.assetAllocation.find((entry) => entry.type === type);
  return `${toDecimal(item?.share ?? 0).mul(100).toDecimalPlaces(2).toString()}%`;
}
