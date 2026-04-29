import type { PeriodPreset } from "@/lib/period";
import { getPeriodFromPreset } from "@/lib/period";
import { getPortfolioAnalytics } from "@/lib/portfolio/portfolioAnalyticsService";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { PeriodFilter } from "@/components/period-filter";
import { DataTable } from "@/components/data-table";

export const dynamic = "force-dynamic";

export default async function InstrumentsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const period = getPeriodFromPreset(params.period as PeriodPreset, params.start, params.end);
  const [analytics, instruments] = await Promise.all([
    getPortfolioAnalytics(period),
    prisma.instrument.findMany({ orderBy: { ticker: "asc" } }),
  ]);
  const breakdown = new Map(analytics.instrumentBreakdown.map((item) => [item.instrumentId, item]));

  return (
    <div className="space-y-6">
      <PageHeader title="Instruments">
        <PeriodFilter />
      </PageHeader>
      <DataTable
        filterKey="type"
        filterLabel="Тип"
        columns={[
          { key: "ticker", label: "Тикер", hrefPrefix: "/instruments" },
          { key: "name", label: "Название" },
          { key: "isin", label: "ISIN" },
          { key: "type", label: "Тип" },
          { key: "price", label: "Цена", align: "right" },
          { key: "value", label: "Стоимость", align: "right" },
          { key: "profit", label: "Прибыль", align: "right" },
          { key: "dividends", label: "Дивиденды", align: "right" },
          { key: "coupons", label: "Купоны", align: "right" },
        ]}
        rows={instruments.map((instrument) => {
          const item = breakdown.get(instrument.id);
          return {
            id: instrument.id,
            ticker: instrument.ticker,
            name: instrument.name,
            isin: instrument.isin ?? "",
            type: instrument.type,
            price: instrument.currentPrice ? formatMoney(instrument.currentPrice, instrument.currency) : "н/д",
            value: item ? formatMoney(item.marketValue, instrument.currency) : formatMoney(0, instrument.currency),
            profit: item ? formatMoney(item.profit, instrument.currency) : formatMoney(0, instrument.currency),
            dividends: item ? formatMoney(item.dividends, instrument.currency) : formatMoney(0, instrument.currency),
            coupons: item ? formatMoney(item.coupons, instrument.currency) : formatMoney(0, instrument.currency),
          };
        })}
      />
    </div>
  );
}
