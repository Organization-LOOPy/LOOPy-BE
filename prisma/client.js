//import { PrismaClient } from "@prisma/client";
import pkg from '@prisma/client';
const { PrismaClient } = pkg;

const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["query", "error", "warn"],
  });

if (process.env.NODE_ENV !== "prod") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
