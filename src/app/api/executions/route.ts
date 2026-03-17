import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { listQuerySchema } from "@/lib/validations";
import { z } from "zod";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = listQuerySchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    });
    const { page, limit, search } = query;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { workflow: { name: { contains: search, mode: "insensitive" as const } } },
            { triggered_by: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [executions, total] = await Promise.all([
      prisma.execution.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: { workflow: { select: { id: true, name: true } } },
      }),
      prisma.execution.count({ where }),
    ]);

    return NextResponse.json({
      data: executions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Executions API Error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to fetch executions" },
      { status: 500 }
    );
  }
}
