import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prismaV5: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prismaV5 ??
  new PrismaClient({
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaV5 = prisma;
}
