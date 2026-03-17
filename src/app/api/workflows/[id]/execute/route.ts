import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startExecutionSchema } from "@/lib/validations";
import { runWorkflow } from "@/lib/execution-engine";
import { z } from "zod";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params;
    const body = await request.json();
    const { data, triggered_by } = startExecutionSchema.parse(body);

    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
    });
    if (!workflow)
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    if (!workflow.is_active)
      return NextResponse.json({ error: "Workflow is inactive" }, { status: 400 });

    const execution = await prisma.execution.create({
      data: {
        workflow_id: workflowId,
        workflow_version: workflow.version,
        status: "pending",
        data: data ?? {},
        logs: [],
        triggered_by: triggered_by ?? "anonymous",
      },
    });

    // Run asynchronously (fire and forget in dev – use a queue in prod)
    runWorkflow(execution.id).catch(console.error);

    return NextResponse.json(execution, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: error.issues }, { status: 400 });
    return NextResponse.json(
      { error: "Failed to start execution" },
      { status: 500 }
    );
  }
}
