import { execSync } from "node:child_process"
import { readFileSync, readdirSync } from "node:fs"
import { extname, join } from "node:path"
import { PrismaClient } from "@prisma/client"
import { MSSQLServerContainer } from "@testcontainers/mssqlserver"
import type { StartedMSSQLServerContainer } from "@testcontainers/mssqlserver"
import { afterAll, beforeAll } from "vitest"
import { prisma } from "../libs/prisma"

let mssqlContainer: StartedMSSQLServerContainer
let testPrisma: PrismaClient

async function executeViewSqlFiles() {
	try {
		// Get all SQL files in the views/dbo directory
		const viewsPath = join(process.cwd(), "prisma", "views", "dbo")
		const allFiles = readdirSync(viewsPath)
		const sqlFiles = allFiles.filter((file) => extname(file) === ".sql")

		console.log(`Found ${sqlFiles.length} view files to execute`)

		// Execute each SQL file using Prisma's executeRaw with dynamic SQL
		for (const sqlFile of sqlFiles.sort()) {
			const filePath = join(viewsPath, sqlFile)
			const sqlContent = readFileSync(filePath, "utf-8").trim()

			try {
				// Use executeRaw with template literal to execute DDL
				await testPrisma.$executeRaw`EXEC(${sqlContent})`
				console.log(`  ✅ Successfully executed ${sqlFile}`)
			} catch (prismaError) {
				console.error(`  ❌ Failed to execute ${sqlFile}:`, prismaError)
				throw prismaError
			}
		}

		console.log("✅ Database views execution completed")
	} catch (error) {
		console.error("❌ Failed to execute view SQL files:", error)
		throw error
	}
}

beforeAll(async () => {
	console.log("🚀 Starting MSSQL container for tests...")

	// Start MSSQL Server container
	mssqlContainer = await new MSSQLServerContainer(
		"mcr.microsoft.com/mssql/server:2022-latest",
	)
		.acceptLicense()
		.withPassword("YourStrongPassword123!")
		.start()

	// Get connection details from the container
	const host = mssqlContainer.getHost()
	const port = mssqlContainer.getPort()
	const username = mssqlContainer.getUsername()
	const password = mssqlContainer.getPassword()

	// Build SQL Server connection string (using master database)
	const sqlServerConnectionString = `sqlserver://${host}:${port};database=master;user=${username};password=${password};encrypt=true;trustServerCertificate=true;connection_limit=1;pool_timeout=10`

	console.log("🔗 Connection string:", sqlServerConnectionString)

	// Create Prisma client with test database
	testPrisma = new PrismaClient({
		datasources: {
			db: {
				url: sqlServerConnectionString,
			},
		},
	})

	// Connect to the database
	await testPrisma.$connect()

	console.log("✅ MSSQL container started and connected")

	// Run migrations
	process.env.DATABASE_URL = sqlServerConnectionString

	try {
		execSync("npx prisma migrate deploy", {
			stdio: "inherit",
			env: { ...process.env, DATABASE_URL: sqlServerConnectionString },
		})
		console.log("✅ Database migrations completed")
	} catch (error) {
		console.error("❌ Migration failed:", error)
		throw error
	}

	// Execute database views
	try {
		await executeViewSqlFiles()
	} catch (error) {
		console.error("❌ View execution failed:", error)
		throw error
	}

	// Force main prisma client to reconnect with test database
	await prisma.$disconnect()
	// Update the datasource URL for the main prisma client
	const mainPrismaClientConfig = {
		datasources: {
			db: {
				url: sqlServerConnectionString,
			},
		},
	}
	// Replace the main prisma client with one pointing to test database
	Object.assign(prisma, new PrismaClient(mainPrismaClientConfig))
	await prisma.$connect()
	console.log("✅ Main prisma client connected to test database")
}, 60000) // 60 second timeout for container startup

afterAll(async () => {
	console.log("🧹 Cleaning up test environment...")

	// Disconnect Prisma clients
	if (testPrisma) {
		await testPrisma.$disconnect()
	}

	// Disconnect main prisma client
	await prisma.$disconnect()

	// Stop the container
	if (mssqlContainer) {
		await mssqlContainer.stop()
	}

	console.log("✅ Test environment cleanup completed")
})

export { testPrisma }
