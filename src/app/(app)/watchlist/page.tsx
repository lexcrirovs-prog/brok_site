import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { AddWatchlistForm } from "@/components/quick-forms";

export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const [items, instruments] = await Promise.all([
    prisma.watchlistItem.findMany({
      orderBy: [{ status: "asc" }, { priority: "asc" }],
      include: { instrument: true },
    }),
    prisma.instrument.findMany({ orderBy: { ticker: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Избранное" />
      <AddWatchlistForm instruments={instruments.map((instrument) => ({ id: instrument.id, ticker: instrument.ticker, name: instrument.name }))} />
      <DataTable
        filterKey="status"
        filterLabel="Статус"
        columns={[
          { key: "ticker", label: "Тикер", hrefPrefix: "/instruments" },
          { key: "name", label: "Название" },
          { key: "targetBuyPrice", label: "Цена покупки", align: "right" },
          { key: "targetSellPrice", label: "Цена продажи", align: "right" },
          { key: "priority", label: "Приоритет", align: "right" },
          { key: "status", label: "Статус" },
          { key: "reason", label: "Причина" },
          { key: "createdAt", label: "Создано" },
        ]}
        rows={items.map((item) => ({
          id: item.instrumentId,
          ticker: item.instrument.ticker,
          name: item.instrument.name,
          targetBuyPrice: item.targetBuyPrice ? formatMoney(item.targetBuyPrice, item.instrument.currency) : "",
          targetSellPrice: item.targetSellPrice ? formatMoney(item.targetSellPrice, item.instrument.currency) : "",
          priority: item.priority,
          status: item.status,
          reason: item.reason ?? "",
          createdAt: formatDate(item.createdAt),
        }))}
      />
    </div>
  );
}
