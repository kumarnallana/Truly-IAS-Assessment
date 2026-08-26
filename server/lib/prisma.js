import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const globalForPrisma = globalThis;

function createPrismaClient() {
  return new PrismaClient({
    datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  });
}

export const prisma = globalForPrisma.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__prisma = prisma;
}
