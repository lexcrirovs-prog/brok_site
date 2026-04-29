import { NextResponse } from "next/server";
import { reprocessImport } from "@/lib/import/importService";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const result = await reprocessImport(id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ошибка повторной обработки" },
      { status: 400 },
    );
  }
}
