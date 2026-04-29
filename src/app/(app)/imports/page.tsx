import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { UploadReportForm } from "@/components/upload-report-form";

export const dynamic = "force-dynamic";

export default async function ImportsPage() {
  const [brokers, imports] = await Promise.all([
    prisma.broker.findMany({ orderBy: { name: "asc" } }),
    prisma.importFile.findMany({
      orderBy: { uploadedAt: "desc" },
      include: { broker: true, rows: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Import Reports" />
      <UploadReportForm brokers={brokers.map((broker) => ({ id: broker.id, name: broker.name }))} />
      <DataTable
        filterKey="status"
        filterLabel="Статус"
        columns={[
          { key: "fileName", label: "Файл", hrefPrefix: "/imports" },
          { key: "broker", label: "Брокер" },
          { key: "fileType", label: "Тип" },
          { key: "uploadedAt", label: "Загружен" },
          { key: "period", label: "Период" },
          { key: "rows", label: "Строки", align: "right" },
          { key: "status", label: "Статус" },
        ]}
        rows={imports.map((item) => ({
          id: item.id,
          fileName: item.fileName,
          broker: item.broker.name,
          fileType: item.fileType,
          uploadedAt: formatDate(item.uploadedAt),
          period:
            item.detectedPeriodStart && item.detectedPeriodEnd
              ? `${formatDate(item.detectedPeriodStart)} - ${formatDate(item.detectedPeriodEnd)}`
              : "н/д",
          rows: item.rows.length,
          status: item.status,
        }))}
      />
    </div>
  );
}
