import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { AddNoteForm } from "@/components/quick-forms";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const [notes, instruments] = await Promise.all([
    prisma.investmentNote.findMany({
      orderBy: { createdAt: "desc" },
      include: { instrument: true },
    }),
    prisma.instrument.findMany({ orderBy: { ticker: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Notes" />
      <AddNoteForm instruments={instruments.map((instrument) => ({ id: instrument.id, ticker: instrument.ticker, name: instrument.name }))} />
      <DataTable
        filterKey="status"
        filterLabel="Статус"
        columns={[
          { key: "ticker", label: "Тикер", hrefPrefix: "/instruments" },
          { key: "title", label: "Заголовок" },
          { key: "sourceType", label: "Источник" },
          { key: "sourceName", label: "Имя" },
          { key: "thesis", label: "Тезис" },
          { key: "expectedPrice", label: "Цель", align: "right" },
          { key: "reviewDate", label: "Пересмотр" },
          { key: "status", label: "Статус" },
        ]}
        rows={notes.map((note) => ({
          id: note.instrumentId,
          ticker: note.instrument.ticker,
          title: note.title,
          sourceType: note.sourceType,
          sourceName: note.sourceName ?? "",
          thesis: note.thesis ?? note.text,
          expectedPrice: note.expectedPrice ? formatMoney(note.expectedPrice, note.instrument.currency) : "",
          reviewDate: note.reviewDate ? formatDate(note.reviewDate) : "",
          status: note.status,
        }))}
      />
    </div>
  );
}
