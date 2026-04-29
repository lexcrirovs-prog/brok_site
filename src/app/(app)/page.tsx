import type { PeriodPreset } from "@/lib/period";
import { getPeriodFromPreset } from "@/lib/period";
import { getPortfolioAnalytics } from "@/lib/portfolio/portfolioAnalyticsService";
import { buildChartData, assetShare } from "@/lib/portfolio/chartData";
import { formatMoney, formatPercent, toDecimal } from "@/lib/format";
import { PeriodFilter } from "@/components/period-filter";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { PortfolioCharts } from "@/components/portfolio-charts";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const period = getPeriodFromPreset(params.period as PeriodPreset, params.start, params.end);
  const analytics = await getPortfolioAnalytics(period);
  const charts = buildChartData(analytics);
  const netTone = analytics.netProfit.gte(0) ? "positive" : "negative";

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard">
        <PeriodFilter />
      </PageHeader>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Стоимость портфеля" value={formatMoney(analytics.value)} />
        <StatCard label="Прибыль за период" value={formatMoney(analytics.grossProfit)} tone={analytics.grossProfit.gte(0) ? "positive" : "negative"} />
        <StatCard label="Прибыль после налогов" value={formatMoney(analytics.netProfit)} tone={netTone} />
        <StatCard label="Дивиденды" value={formatMoney(analytics.dividendsGross)} detail={`После налога: ${formatMoney(analytics.dividendsNet)}`} />
        <StatCard label="Купоны" value={formatMoney(analytics.couponsGross)} detail={`После налога: ${formatMoney(analytics.couponsNet)}`} />
        <StatCard label="Комиссии" value={formatMoney(analytics.commissions)} tone="warning" />
        <StatCard label="Налоги" value={formatMoney(analytics.taxes)} tone="warning" />
        <StatCard label="Доходность" value={formatPercent(analytics.returnPercent)} detail={`XIRR: ${analytics.xirr ? formatPercent(analytics.xirr) : "н/д"}`} />
        <StatCard label="Лучший актив" value={analytics.bestAsset?.ticker ?? "н/д"} detail={analytics.bestAsset ? formatMoney(analytics.bestAsset.profit) : undefined} tone="positive" />
        <StatCard label="Худший актив" value={analytics.worstAsset?.ticker ?? "н/д"} detail={analytics.worstAsset ? formatMoney(analytics.worstAsset.profit) : undefined} tone={analytics.worstAsset && analytics.worstAsset.profit.lt(0) ? "negative" : "neutral"} />
        <StatCard label="Доля акций" value={assetShare(analytics, "STOCK")} />
        <StatCard label="Доля облигаций" value={assetShare(analytics, "BOND")} />
        <StatCard label="Доля кэша" value={assetShare(analytics, "CASH")} detail={`Пополнения: ${formatMoney(analytics.deposits)} · Выводы: ${formatMoney(analytics.withdrawals)}`} />
        <StatCard label="Реализованная прибыль" value={formatMoney(analytics.realizedProfit)} tone={analytics.realizedProfit.gte(0) ? "positive" : "negative"} />
        <StatCard label="Нереализованная прибыль" value={formatMoney(analytics.unrealizedProfit)} tone={analytics.unrealizedProfit.gte(0) ? "positive" : "negative"} />
        <StatCard label="Годовая доходность" value={analytics.annualReturn ? formatPercent(analytics.annualReturn) : "н/д"} detail={`Чистый результат: ${formatMoney(toDecimal(analytics.netProfit))}`} />
      </section>

      <PortfolioCharts {...charts} />
    </div>
  );
}
