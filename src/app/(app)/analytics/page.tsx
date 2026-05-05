import type { PeriodPreset } from "@/lib/period";
import { getPeriodFromPreset } from "@/lib/period";
import { getPortfolioAnalytics } from "@/lib/portfolio/portfolioAnalyticsService";
import { buildChartData } from "@/lib/portfolio/chartData";
import { formatMoney, formatPercent } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { PeriodFilter } from "@/components/period-filter";
import { StatCard } from "@/components/stat-card";
import { PortfolioCharts } from "@/components/portfolio-charts";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const period = getPeriodFromPreset(params.period as PeriodPreset, params.start, params.end);
  const analytics = await getPortfolioAnalytics(period);

  return (
    <div className="space-y-6">
      <PageHeader title="Аналитика">
        <PeriodFilter />
      </PageHeader>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Валовая прибыль" value={formatMoney(analytics.grossProfit)} />
        <StatCard label="Чистая прибыль" value={formatMoney(analytics.netProfit)} />
        <StatCard label="Без дивидендов" value={formatMoney(analytics.profitWithoutDividends)} />
        <StatCard label="Без купонов" value={formatMoney(analytics.profitWithoutCoupons)} />
        <StatCard label="XIRR" value={analytics.xirr ? formatPercent(analytics.xirr) : "н/д"} />
        <StatCard label="Пополнения" value={formatMoney(analytics.deposits)} />
        <StatCard label="Выводы" value={formatMoney(analytics.withdrawals)} />
        <StatCard label="Стоимость" value={formatMoney(analytics.value)} />
      </section>
      <PortfolioCharts {...buildChartData(analytics)} />
    </div>
  );
}
