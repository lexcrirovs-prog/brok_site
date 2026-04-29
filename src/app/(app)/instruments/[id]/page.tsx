import { notFound } from "next/navigation";
import type { PeriodPreset } from "@/lib/period";
import { getPeriodFromPreset } from "@/lib/period";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney } from "@/lib/format";
import {
  calculatePositions,
  getPortfolioAnalytics,
} from "@/lib/portfolio/portfolioAnalyticsService";
import { PageHeader } from "@/components/page-header";
import { PeriodFilter } from "@/components/period-filter";
import { StatCard } from "@/components/stat-card";
import { DataTable } from "@/components/data-table";

export const dynamic = "force-dynamic";

export default async function InstrumentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const period = getPeriodFromPreset(query.period as PeriodPreset, query.start, query.end);
  const [instrument, analytics] = await Promise.all([
    prisma.instrument.findUnique({
      where: { id },
      include: {
        transactions: {
          orderBy: { date: "desc" },
          include: { account: { include: { broker: true } } },
        },
        notes: { orderBy: { createdAt: "desc" } },
        watchlistItems: { orderBy: { createdAt: "desc" } },
      },
    }),
    getPortfolioAnalytics(period),
  ]);

  if (!instrument) {
    notFound();
  }

  const instrumentInput = {
    transactions: analytics.input.transactions.filter((transaction) => transaction.instrumentId === instrument.id),
  };
  const position = calculatePositions(instrumentInput, period)[0];
  const breakdown = analytics.instrumentBreakdown.find((item) => item.instrumentId === instrument.id);

  return (
    <div className="space-y-6">
      <PageHeader title={`${instrument.ticker} · ${instrument.name}`}>
        <PeriodFilter />
      </PageHeader>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Тип" value={instrument.type} detail={instrument.isin ?? undefined} />
        <StatCard label="Текущая позиция" value={position ? position.quantity.toString() : "0"} />
        <StatCard label="Средняя цена" value={position ? formatMoney(position.averagePrice, instrument.currency) : "н/д"} />
        <StatCard label="Текущая цена" value={instrument.currentPrice ? formatMoney(instrument.currentPrice, instrument.currency) : "н/д"} />
        <StatCard label="Реализованная прибыль" value={breakdown ? formatMoney(breakdown.realizedProfit, instrument.currency) : formatMoney(0)} />
        <StatCard label="Нереализованная прибыль" value={breakdown ? formatMoney(breakdown.unrealizedProfit, instrument.currency) : formatMoney(0)} />
        <StatCard label="Дивиденды" value={breakdown ? formatMoney(breakdown.dividends, instrument.currency) : formatMoney(0)} />
        <StatCard label="Купоны" value={breakdown ? formatMoney(breakdown.coupons, instrument.currency) : formatMoney(0)} />
        <StatCard label="Налоги" value={breakdown ? formatMoney(breakdown.taxes, instrument.currency) : formatMoney(0)} />
        <StatCard label="Комиссии" value={breakdown ? formatMoney(breakdown.commissions, instrument.currency) : formatMoney(0)} />
        <StatCard label="Стоимость" value={position ? formatMoney(position.marketValue, instrument.currency) : formatMoney(0)} />
        <StatCard label="Целевая покупка" value={instrument.watchlistItems[0]?.targetBuyPrice ? formatMoney(instrument.watchlistItems[0].targetBuyPrice, instrument.currency) : "н/д"} />
      </section>

      <DataTable
        columns={[
          { key: "date", label: "Дата" },
          { key: "broker", label: "Брокер" },
          { key: "operationType", label: "Операция" },
          { key: "quantity", label: "Кол-во", align: "right" },
          { key: "price", label: "Цена", align: "right" },
          { key: "amountGross", label: "Сумма", align: "right" },
          { key: "tax", label: "Налог", align: "right" },
          { key: "commission", label: "Комиссия", align: "right" },
        ]}
        rows={instrument.transactions.map((transaction) => ({
          id: transaction.id,
          date: formatDate(transaction.date),
          broker: transaction.account.broker.name,
          operationType: transaction.operationType,
          quantity: transaction.quantity.toString(),
          price: formatMoney(transaction.price, transaction.currency),
          amountGross: formatMoney(transaction.amountGross, transaction.currency),
          tax: formatMoney(transaction.taxAmount, transaction.currency),
          commission: formatMoney(transaction.commissionAmount, transaction.currency),
        }))}
      />

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">Заметки</h2>
          <div className="space-y-3">
            {instrument.notes.map((note) => (
              <article key={note.id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                <div className="font-medium">{note.title}</div>
                <div className="mt-1 text-sm text-slate-600">{note.thesis ?? note.text}</div>
                <div className="mt-1 text-xs text-slate-500">{note.sourceType} · {formatDate(note.createdAt)}</div>
              </article>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">История идеи</h2>
          <div className="space-y-3">
            {instrument.watchlistItems.map((item) => (
              <article key={item.id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                <div className="font-medium">{item.status} · приоритет {item.priority}</div>
                <div className="mt-1 text-sm text-slate-600">{item.reason ?? item.comment}</div>
                <div className="mt-1 text-xs text-slate-500">{formatDate(item.createdAt)}</div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
