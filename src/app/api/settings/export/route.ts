import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function csvEscape(value: unknown): string {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET() {
  const transactions = await prisma.transaction.findMany({
    orderBy: { date: "asc" },
    include: { account: { include: { broker: true } }, instrument: true },
  });

  const header = [
    "date",
    "broker",
    "account",
    "instrument",
    "operationType",
    "quantity",
    "price",
    "amountGross",
    "taxAmount",
    "commissionAmount",
    "amountNet",
    "currency",
  ];
  const rows = transactions.map((transaction) =>
    [
      transaction.date.toISOString(),
      transaction.account.broker.name,
      transaction.account.name,
      transaction.instrument?.ticker ?? "",
      transaction.operationType,
      transaction.quantity,
      transaction.price,
      transaction.amountGross,
      transaction.taxAmount,
      transaction.commissionAmount,
      transaction.amountNet,
      transaction.currency,
    ]
      .map(csvEscape)
      .join(","),
  );

  return new NextResponse([header.join(","), ...rows].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="brok_site_transactions.csv"',
    },
  });
}
