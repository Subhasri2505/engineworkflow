import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createRuleSchema } from "@/lib/validations";
import { z } from "zod";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rules = await prisma.rule.findMany({
      where: { step_id: id },
      orderBy: { priority: "asc" },
    });
    return NextResponse.json(rules);
  } catch {
    return NextResponse.json({ error: "Failed to fetch rules" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = createRuleSchema.parse(body);

    const step = await prisma.step.findUnique({ where: { id } });
    if (!step)
      return NextResponse.json({ error: "Step not found" }, { status: 404 });

    const rule = await prisma.rule.create({
      data: { ...data, step_id: id },
    });
    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: error.issues }, { status: 400 });
    return NextResponse.json({ error: "Failed to create rule" }, { status: 500 });
  }
}
