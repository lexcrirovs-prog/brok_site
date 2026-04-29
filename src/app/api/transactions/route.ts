import { OperationType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createTransactionFingerprint } from "@/lib/portfolio/fingerprint";

export async function GET() {
  const transactions = await prisma.transaction.findMany({
    orderBy: { date: "desc" },
    include: {
      account: { include: { broker: true } },
      instrument: true,
    },
  });

  return NextResponse.json(transactions);
}

export async function POST(request: Request) {
  const body = await request.json();
  const account = await prisma.account.findUniqueOrThrow({ where: { id: body.accountId } });
  const fingerprint = createTransactionFingerprint({
    brokerId: account.brokerId,
    accountId: account.id,
    date: body.date,
    operationType: body.operationType,
    instrumentId: body.instrumentId ?? null,
    quantity: body.quantity ?? "0",
    amountGross: body.amountGross ?? "0",
    currency: body.currency ?? account.currency,
  });

  const existing = await prisma.transaction.findUnique({ where: { fingerprint } });
  if (existing) {
    return NextResponse.json({ error: "Такая операция уже импортирована", duplicate: true }, { status: 409 });
  }

  const transaction = await prisma.transaction.create({
    data: {
      accountId: account.id,
      instrumentId: body.instrumentId || null,
      date: new Date(body.date),
      operationType: body.operationType as OperationType,
      quantity: body.quantity ?? "0",
      price: body.price ?? "0",
      amountGross: body.amountGross ?? "0",
      taxAmount: body.taxAmount ?? "0",
      commissionAmount: body.commissionAmount ?? "0",
      amountNet: body.amountNet ?? body.amountGross ?? "0",
      accruedInterest: body.accruedInterest ?? "0",
      currency: body.currency ?? account.currency,
      rawText: body.rawText,
      comment: body.comment,
      fingerprint,
    },
  });

  return NextResponse.json(transaction);
}
