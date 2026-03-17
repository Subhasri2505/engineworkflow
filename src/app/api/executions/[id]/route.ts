import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const execution = await prisma.execution.findUnique({
      where: { id },
      include: { workflow: { select: { id: true, name: true, version: true } } },
    });
    if (!execution)
      return NextResponse.json({ error: "Execution not found" }, { status: 404 });
    return NextResponse.json(execution);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch execution" },
      { status: 500 }
    );
  }
}
