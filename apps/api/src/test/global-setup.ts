import { execSync } from "node:child_process"
import { readFileSync, readdirSync } from "node:fs"
import { extname, join } from "node:path"
import { PrismaClient } from "@prisma/client"
import { MSSQLServerContainer } from "@testcontainers/mssqlserver"

export default async function globalSetup() {
	console.log("🚀 テストセットアップ開始")

	// MSSQL Server コンテナを起動
	const mssqlContainer = await new MSSQLServerContainer(
		"mcr.microsoft.com/mssql/server:2022-latest",
	)
		.acceptLicense()
		.withPassword("YourStrongPassword123!")
		.start()

	// コンテナから接続詳細を取得
	const host = mssqlContainer.getHost()
	const port = mssqlContainer.getPort()
	const username = mssqlContainer.getUsername()
	const password = mssqlContainer.getPassword()

	// SQL Server 接続文字列を構築（master データベースを使用）
	const sqlServerConnectionString = `sqlserver://${host}:${port};database=master;user=${username};password=${password};encrypt=true;trustServerCertificate=true;connection_limit=1;pool_timeout=10`

	// テストデータベース用の Prisma クライアントを作成
	const prisma = new PrismaClient({
		datasources: {
			db: {
				url: sqlServerConnectionString,
			},
		},
	})

	// データベースに接続
	await prisma.$connect()

	// マイグレーションを実行
	try {
		execSync("npx prisma migrate deploy", {
			stdio: "inherit",
			env: { ...process.env, DATABASE_URL: sqlServerConnectionString },
		})
	} catch (error) {
		console.error("❌ Migration failed:", error)
		await prisma.$disconnect()
		await mssqlContainer.stop()
		throw error
	}

	// データベースビューを実行
	try {
		await executeViewSqlFiles(prisma)
	} catch (error) {
		console.error("❌ View execution failed:", error)
		await prisma.$disconnect()
		await mssqlContainer.stop()
		throw error
	}

	// セットアップ用の Prisma クライアントを切断
	await prisma.$disconnect()

	console.log("✅ テストセットアップ完了")

	// テストで使用するために環境変数に接続文字列を保存
	process.env.TEST_DATABASE_URL = sqlServerConnectionString

	// teardown 関数を返す
	return async () => {
		console.log("🧹 テストクリーンアップ開始")

		try {
			await mssqlContainer.stop()
			console.log("✅ テストクリーンアップ完了")
		} catch (error) {
			console.error("❌ クリーンアップ失敗:", error)
			// エラーをスローせずに続行（Testcontainers の自動クリーンアップ機構が最終的に処理する）
		}
	}
}

async function executeViewSqlFiles(prisma: PrismaClient) {
	// views/dbo ディレクトリ内のすべての SQL ファイルを取得
	const viewsPath = join(process.cwd(), "prisma", "views", "dbo")
	const allFiles = readdirSync(viewsPath)
	const sqlFiles = allFiles.filter((file) => extname(file) === ".sql")

	// Prisma の executeRaw を使用して各 SQL ファイルを実行
	for (const sqlFile of sqlFiles.sort()) {
		const filePath = join(viewsPath, sqlFile)
		const sqlContent = readFileSync(filePath, "utf-8").trim()

		// テンプレートリテラルで executeRaw を使用して DDL を実行
		await prisma.$executeRaw`EXEC(${sqlContent})`
	}
}
