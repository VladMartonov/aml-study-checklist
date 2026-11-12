import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import type { Task } from "./tasks";

export function toTask(row: {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date;
}): Task {
  return {
    id: row.id,
    title: row.title,
    completed: row.completed,
    createdAt: row.createdAt.toISOString(),
  };
}

export function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export function isNotFound(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  );
}

/** Log details on the server only; the browser gets a generic message. */
export function serverError(context: string, error: unknown) {
  console.error(`[tasks] ${context} failed:`, error);
  return errorResponse(
    "Something went wrong on the server. Please try again.",
    500,
  );
}
