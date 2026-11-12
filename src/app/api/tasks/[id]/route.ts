import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, isNotFound, serverError, toTask } from "@/lib/api";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

const NOT_FOUND = "This task no longer exists. It may have been deleted.";

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid request.", 400);
  }

  const completed = (body as { completed?: unknown } | null)?.completed;
  if (typeof completed !== "boolean") {
    return errorResponse("Invalid request.", 400);
  }

  try {
    const row = await prisma.task.update({
      where: { id },
      data: { completed },
    });
    return NextResponse.json({ task: toTask(row) });
  } catch (error) {
    if (isNotFound(error)) return errorResponse(NOT_FOUND, 404);
    return serverError("update", error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const { id } = await params;

  try {
    await prisma.task.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (isNotFound(error)) return errorResponse(NOT_FOUND, 404);
    return serverError("delete", error);
  }
}
