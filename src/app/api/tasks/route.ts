import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateTitle } from "@/lib/tasks";
import { errorResponse, serverError, toTask } from "@/lib/api";

// Always run at request time; never query the database during the build.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await prisma.task.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    return NextResponse.json(
      { tasks: rows.map(toTask) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return serverError("list", error);
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid request.", 400);
  }

  const result = validateTitle((body as { title?: unknown } | null)?.title);
  if (!result.ok) {
    return errorResponse(result.error, 400);
  }

  try {
    const row = await prisma.task.create({ data: { title: result.title } });
    return NextResponse.json({ task: toTask(row) }, { status: 201 });
  } catch (error) {
    return serverError("create", error);
  }
}
