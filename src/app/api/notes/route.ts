import { InvestmentIdeaStatus, InvestmentSourceType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  return NextResponse.json(
    await prisma.investmentNote.findMany({
      orderBy: { createdAt: "desc" },
      include: { instrument: true },
    }),
  );
}

export async function POST(request: Request) {
  const body = await request.json();
  const note = await prisma.investmentNote.create({
    data: {
      instrumentId: body.instrumentId,
      title: body.title,
      text: body.text,
      sourceType: (body.sourceType ?? InvestmentSourceType.OWN_IDEA) as InvestmentSourceType,
      sourceName: body.sourceName,
      sourceUrl: body.sourceUrl,
      thesis: body.thesis,
      expectedPrice: body.expectedPrice || null,
      expectedDate: body.expectedDate ? new Date(body.expectedDate) : null,
      reviewDate: body.reviewDate ? new Date(body.reviewDate) : null,
      status: (body.status ?? InvestmentIdeaStatus.ACTIVE) as InvestmentIdeaStatus,
    },
  });

  return NextResponse.json(note);
}
