import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [brokers, accounts, instruments, transactions, watchlist, notes] = await Promise.all([
    prisma.broker.findMany(),
    prisma.account.findMany(),
    prisma.instrument.findMany(),
    prisma.transaction.findMany(),
    prisma.watchlistItem.findMany(),
    prisma.investmentNote.findMany(),
  ]);

  return NextResponse.json({ exportedAt: new Date().toISOString(), brokers, accounts, instruments, transactions, watchlist, notes });
}
