import pkg from "@prisma/client";
const { PrismaClient, RoleType } = pkg;
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
export { RoleType };
