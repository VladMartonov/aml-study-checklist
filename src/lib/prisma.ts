import { PrismaClient } from "@prisma/client";

// Reuse a single client per server process. The client connects lazily,
// so importing this module never touches the database at build time.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
