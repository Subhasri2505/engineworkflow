import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateWorkflowSchema } from "@/lib/validations";
import { z } from "zod";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workflow = await prisma.workflow.findUnique({
      where: { id },
      include: {
        steps: {
          include: { rules: { orderBy: { priority: "asc" } } },
          orderBy: { order: "asc" },
        },
      },
    });
    if (!workflow)
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    return NextResponse.json(workflow);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch workflow" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = updateWorkflowSchema.parse(body);

    const existing = await prisma.workflow.findUnique({ where: { id } });
    if (!existing)
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

    const workflow = await prisma.workflow.update({
      where: { id },
      data: { ...data, version: existing.version + 1 },
    });
    return NextResponse.json(workflow);
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: error.issues }, { status: 400 });
    return NextResponse.json(
      { error: "Failed to update workflow" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.workflow.delete({ where: { id } });
    return NextResponse.json({ message: "Workflow deleted" });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete workflow" },
      { status: 500 }
    );
  }
}
