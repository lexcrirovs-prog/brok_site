import { ImportRowStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json();
  const updated = await prisma.importRow.update({
    where: { id },
    data: {
      normalizedData: body.normalizedData as Prisma.InputJsonValue,
      status: (body.status as ImportRowStatus) ?? ImportRowStatus.RECOGNIZED,
      warning: body.warning ?? null,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const updated = await prisma.importRow.update({
    where: { id },
    data: { status: ImportRowStatus.REJECTED },
  });

  return NextResponse.json(updated);
}
