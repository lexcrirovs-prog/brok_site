import { BrokerType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  return NextResponse.json(await prisma.broker.findMany({ orderBy: { name: "asc" } }));
}

export async function POST(request: Request) {
  const body = await request.json();
  const broker = await prisma.broker.create({
    data: {
      name: body.name,
      type: (body.type ?? BrokerType.OTHER) as BrokerType,
    },
  });

  return NextResponse.json(broker);
}
