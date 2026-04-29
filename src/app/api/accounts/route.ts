import { AccountType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  return NextResponse.json(
    await prisma.account.findMany({
      orderBy: { name: "asc" },
      include: { broker: true },
    }),
  );
}

export async function POST(request: Request) {
  const body = await request.json();
  const account = await prisma.account.create({
    data: {
      brokerId: body.brokerId,
      name: body.name,
      currency: body.currency ?? "RUB",
      accountType: (body.accountType ?? AccountType.BROKERAGE) as AccountType,
    },
  });

  return NextResponse.json(account);
}
