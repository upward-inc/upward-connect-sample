import { PrismaMssql } from "@prisma/adapter-mssql"
import { PrismaClient } from "../../prisma/generated/client"
import { configuration } from "../configuration"

const adapter = new PrismaMssql(configuration.DATABASE_URL)

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma: PrismaClient =
	globalForPrisma.prisma || new PrismaClient({ adapter })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
