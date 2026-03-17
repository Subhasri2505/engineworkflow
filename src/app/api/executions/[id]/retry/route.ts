import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runWorkflow } from "@/lib/execution-engine";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const execution = await prisma.execution.findUnique({ where: { id } });
    if (!execution)
      return NextResponse.json({ error: "Execution not found" }, { status: 404 });

    if (execution.status !== "failed") {
      return NextResponse.json(
        { error: "Only failed executions can be retried" },
        { status: 400 }
      );
    }

    const retried = await prisma.execution.update({
      where: { id },
      data: {
        status: "pending",
        retries: execution.retries + 1,
        started_at: null,
        ended_at: null,
        logs: [],
      },
    });

    runWorkflow(retried.id).catch(console.error);

    return NextResponse.json(retried);
  } catch {
    return NextResponse.json(
      { error: "Failed to retry execution" },
      { status: 500 }
    );
  }
}
