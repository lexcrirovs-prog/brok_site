import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  await prisma.priceUpdate.deleteMany();
  await prisma.watchlistItem.deleteMany();
  await prisma.investmentNote.deleteMany();
  await prisma.positionSnapshot.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.importRow.deleteMany();
  await prisma.importFile.deleteMany();
  return NextResponse.json({ ok: true });
}
