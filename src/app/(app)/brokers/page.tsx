import type { PeriodPreset } from "@/lib/period";
import { getPeriodFromPreset } from "@/lib/period";
import { getPortfolioAnalytics } from "@/lib/portfolio/portfolioAnalyticsService";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { PeriodFilter } from "@/components/period-filter";
import { DataTable } from "@/components/data-table";

export const dynamic = "force-dynamic";

export default async function BrokersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const period = getPeriodFromPreset(params.period as PeriodPreset, params.start, params.end);
  const analytics = await getPortfolioAnalytics(period);
  const imports = await prisma.importFile.findMany({
    orderBy: { uploadedAt: "desc" },
    include: { broker: true },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Брокеры">
        <PeriodFilter />
      </PageHeader>
      <DataTable
        columns={[
          { key: "broker", label: "Брокер" },
          { key: "value", label: "Деньги", align: "right" },
          { key: "profit", label: "Прибыль", align: "right" },
          { key: "commissions", label: "Комиссии", align: "right" },
          { key: "taxes", label: "Налоги", align: "right" },
          { key: "assets", label: "Активы", align: "right" },
          { key: "lastImport", label: "Последний отчет" },
        ]}
        rows={analytics.brokerBreakdown.map((broker) => {
          const lastImport = imports.find((item) => item.brokerId === broker.brokerId);
          return {
            id: broker.brokerId,
            broker: broker.brokerName,
            value: formatMoney(broker.value),
            profit: formatMoney(broker.profit),
            commissions: formatMoney(broker.commissions),
            taxes: formatMoney(broker.taxes),
            assets: broker.instrumentsCount,
            lastImport: lastImport ? `${lastImport.fileName} (${formatDate(lastImport.uploadedAt)})` : "н/д",
          };
        })}
      />
    </div>
  );
}
