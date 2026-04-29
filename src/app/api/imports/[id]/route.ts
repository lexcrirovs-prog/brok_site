import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteImport } from "@/lib/import/importService";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const imported = await prisma.importFile.findUnique({
    where: { id },
    include: {
      broker: true,
      rows: { orderBy: { rowIndex: "asc" } },
    },
  });

  if (!imported) {
    return NextResponse.json({ error: "Импорт не найден" }, { status: 404 });
  }

  return NextResponse.json(imported);
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await deleteImport(id);
  return NextResponse.json({ ok: true });
}
