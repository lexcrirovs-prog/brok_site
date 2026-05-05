import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const transactions = await prisma.transaction.findMany({
    orderBy: { date: "desc" },
    include: {
      account: { include: { broker: true } },
      instrument: true,
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Операции" />
      <DataTable
        filterKey="operationType"
        filterLabel="Операция"
        columns={[
          { key: "date", label: "Дата" },
          { key: "broker", label: "Брокер" },
          { key: "account", label: "Счет" },
          { key: "instrument", label: "Инструмент" },
          { key: "operationType", label: "Тип" },
          { key: "quantity", label: "Кол-во", align: "right" },
          { key: "price", label: "Цена", align: "right" },
          { key: "amountGross", label: "Сумма", align: "right" },
          { key: "tax", label: "Налог", align: "right" },
          { key: "commission", label: "Комиссия", align: "right" },
          { key: "amountNet", label: "Итого", align: "right" },
        ]}
        rows={transactions.map((transaction) => ({
          id: transaction.instrument?.id ?? transaction.id,
          date: formatDate(transaction.date),
          broker: transaction.account.broker.name,
          account: transaction.account.name,
          instrument: transaction.instrument?.ticker ?? "Денежная операция",
          operationType: transaction.operationType,
          quantity: transaction.quantity.toString(),
          price: formatMoney(transaction.price, transaction.currency),
          amountGross: formatMoney(transaction.amountGross, transaction.currency),
          tax: formatMoney(transaction.taxAmount, transaction.currency),
          commission: formatMoney(transaction.commissionAmount, transaction.currency),
          amountNet: formatMoney(transaction.amountNet, transaction.currency),
        }))}
      />
    </div>
  );
}
