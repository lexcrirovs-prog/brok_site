import { NextResponse } from "next/server";
import { confirmImport } from "@/lib/import/importService";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const result = await confirmImport(id);
  return NextResponse.json(result);
}
