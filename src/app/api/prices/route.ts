import { PriceSourceType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json();
  const updated = await prisma.instrument.update({
    where: { id: body.instrumentId },
    data: {
      currentPrice: body.price,
      currentPriceDate: body.pricedAt ? new Date(body.pricedAt) : new Date(),
      priceUpdates: {
        create: {
          price: body.price,
          currency: body.currency ?? "RUB",
          source: PriceSourceType.MANUAL,
          pricedAt: body.pricedAt ? new Date(body.pricedAt) : new Date(),
        },
      },
    },
  });

  return NextResponse.json(updated);
}
