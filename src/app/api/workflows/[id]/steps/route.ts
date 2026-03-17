import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createStepSchema } from "@/lib/validations";
import { z } from "zod";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params;
    const steps = await prisma.step.findMany({
      where: { workflow_id: workflowId },
      include: { rules: { orderBy: { priority: "asc" } } },
      orderBy: { order: "asc" },
    });
    return NextResponse.json(steps);
  } catch {
    return NextResponse.json({ error: "Failed to fetch steps" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params;
    const body = await request.json();
    const data = createStepSchema.parse(body);

    // Check workflow exists
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
    });
    if (!workflow)
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

    const step = await prisma.step.create({
      data: { ...(data as any), workflow_id: workflowId },
    });
    return NextResponse.json(step, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: error.issues }, { status: 400 });
    return NextResponse.json({ error: "Failed to create step" }, { status: 500 });
  }
}
