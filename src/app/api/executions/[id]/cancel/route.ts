import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const execution = await prisma.execution.findUnique({ where: { id } });
    if (!execution)
      return NextResponse.json({ error: "Execution not found" }, { status: 404 });

    if (!["pending", "in_progress"].includes(execution.status)) {
      return NextResponse.json(
        { error: "Execution cannot be canceled in current state" },
        { status: 400 }
      );
    }

    const updated = await prisma.execution.update({
      where: { id },
      data: { status: "canceled", ended_at: new Date() },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Failed to cancel execution" },
      { status: 500 }
    );
  }
}
