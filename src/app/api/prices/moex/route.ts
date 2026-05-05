import { NextResponse } from "next/server";
import { updateMoexPrices } from "@/lib/market-data/moexIssService";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const instrumentIds = Array.isArray(body.instrumentIds)
    ? body.instrumentIds.filter((value: unknown): value is string => typeof value === "string")
    : undefined;

  const result = await updateMoexPrices(instrumentIds);
  return NextResponse.json(result);
}
