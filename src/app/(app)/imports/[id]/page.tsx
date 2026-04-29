import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { ImportReviewTable } from "@/components/import-review-table";
import { ImportActions } from "@/components/import-actions";

export const dynamic = "force-dynamic";

export default async function ImportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const importFile = await prisma.importFile.findUnique({
    where: { id },
    include: {
      broker: true,
      rows: { orderBy: { rowIndex: "asc" } },
    },
  });

  if (!importFile) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader title={importFile.fileName}>
        <ImportActions importFileId={importFile.id} />
      </PageHeader>
      <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm md:grid-cols-4">
        <div>
          <div className="text-slate-500">Брокер</div>
          <div className="font-medium">{importFile.broker.name}</div>
        </div>
        <div>
          <div className="text-slate-500">Статус</div>
          <div className="font-medium">{importFile.status}</div>
        </div>
        <div>
          <div className="text-slate-500">Загружен</div>
          <div className="font-medium">{formatDate(importFile.uploadedAt)}</div>
        </div>
        <div>
          <div className="text-slate-500">Период</div>
          <div className="font-medium">
            {importFile.detectedPeriodStart && importFile.detectedPeriodEnd
              ? `${formatDate(importFile.detectedPeriodStart)} - ${formatDate(importFile.detectedPeriodEnd)}`
              : "н/д"}
          </div>
        </div>
      </section>
      {importFile.errorMessage ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{importFile.errorMessage}</div>
      ) : null}
      <ImportReviewTable
        importFileId={importFile.id}
        rows={importFile.rows.map((row) => ({
          id: row.id,
          rowIndex: row.rowIndex,
          status: row.status,
          warning: row.warning,
          rawData: row.rawData,
          normalizedData: row.normalizedData as never,
        }))}
      />
    </div>
  );
}
