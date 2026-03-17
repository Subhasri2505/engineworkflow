import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateStepSchema } from "@/lib/validations";
import { z } from "zod";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = updateStepSchema.parse(body);

    const step = await prisma.step.update({ where: { id }, data: data as any });
    return NextResponse.json(step);
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: error.issues }, { status: 400 });
    return NextResponse.json({ error: "Failed to update step" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.step.delete({ where: { id } });
    return NextResponse.json({ message: "Step deleted" });
  } catch {
    return NextResponse.json({ error: "Failed to delete step" }, { status: 500 });
  }
}
