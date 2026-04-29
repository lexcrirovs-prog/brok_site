import { PriceSourceType } from "@prisma/client";
import { NextResponse } from "next/server";
import Papa from "papaparse";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Нужен CSV-файл" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = Papa.parse<Record<string, string>>(buffer.toString("utf8"), { header: true, skipEmptyLines: true });
  let updated = 0;

  for (const row of parsed.data) {
    const ticker = row.ticker || row.Ticker || row["тикер"];
    const price = row.price || row.Price || row["цена"];
    const currency = row.currency || row.Currency || row["валюта"] || "RUB";
    if (!ticker || !price) continue;

    const instrument = await prisma.instrument.findFirst({
      where: { ticker: ticker.toUpperCase(), currency: currency.toUpperCase() },
    });
    if (!instrument) continue;

    await prisma.instrument.update({
      where: { id: instrument.id },
      data: {
        currentPrice: price.replace(",", "."),
        currentPriceDate: new Date(),
        priceUpdates: {
          create: {
            price: price.replace(",", "."),
            currency: currency.toUpperCase(),
            source: PriceSourceType.CSV_IMPORT,
            pricedAt: new Date(),
          },
        },
      },
    });
    updated += 1;
  }

  return NextResponse.json({ updated });
}
