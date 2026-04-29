import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { importReportFile } from "@/lib/import/importService";

export async function GET() {
  const imports = await prisma.importFile.findMany({
    orderBy: { uploadedAt: "desc" },
    include: {
      broker: true,
      rows: true,
    },
  });

  return NextResponse.json(imports);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const brokerId = String(formData.get("brokerId") ?? "");
  const file = formData.get("file");

  if (!brokerId || !(file instanceof File)) {
    return NextResponse.json({ error: "Нужны brokerId и файл" }, { status: 400 });
  }

  const imported = await importReportFile(brokerId, file);
  return NextResponse.json(imported);
}
