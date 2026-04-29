import { WatchlistStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  return NextResponse.json(
    await prisma.watchlistItem.findMany({
      orderBy: [{ status: "asc" }, { priority: "asc" }],
      include: { instrument: true },
    }),
  );
}

export async function POST(request: Request) {
  const body = await request.json();
  const item = await prisma.watchlistItem.create({
    data: {
      instrumentId: body.instrumentId,
      targetBuyPrice: body.targetBuyPrice || null,
      targetSellPrice: body.targetSellPrice || null,
      priority: Number(body.priority ?? 3),
      status: (body.status ?? WatchlistStatus.WATCHING) as WatchlistStatus,
      reason: body.reason,
      sourceName: body.sourceName,
      sourceUrl: body.sourceUrl,
      comment: body.comment,
    },
  });

  return NextResponse.json(item);
}
