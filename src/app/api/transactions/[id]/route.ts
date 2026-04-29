import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json();
  const updated = await prisma.transaction.update({
    where: { id },
    data: body,
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await prisma.transaction.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
