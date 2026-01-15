import { PrismaClient } from "@prisma/client"
import { prisma } from "../libs/prisma"

// globalSetup で設定された環境変数から接続文字列を取得
const testDatabaseUrl = process.env.TEST_DATABASE_URL

if (!testDatabaseUrl) {
	throw new Error(
		"TEST_DATABASE_URL environment variable is not set. Please verify that globalSetup is configured correctly.",
	)
}

// テストデータベース用の Prisma クライアントを作成
const testPrisma = new PrismaClient({
	datasources: {
		db: {
			url: testDatabaseUrl,
		},
	},
})

// 利用するprisma クライアントをテストデータベース用に更新
Object.assign(prisma, testPrisma)

export { testPrisma }
