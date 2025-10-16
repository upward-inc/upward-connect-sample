import { PrismaClient } from "@prisma/client"
import { prisma } from "../libs/prisma"

// globalSetup で設定された環境変数から接続文字列を取得
const testDatabaseUrl = process.env.TEST_DATABASE_URL

if (!testDatabaseUrl) {
	throw new Error(
		"TEST_DATABASE_URL 環境変数が設定されていません。globalSetup が正しく設定されているか確認してください。",
	)
}

// グローバル変数の型定義
const globalForPrisma = globalThis as unknown as {
	testPrisma: PrismaClient | undefined
}

// シングルトンパターン: プロセス全体で1つのインスタンスを共有
if (!globalForPrisma.testPrisma) {
	console.log("🔍 [setup.ts] 新しいPrismaClientを生成します")
	globalForPrisma.testPrisma = new PrismaClient({
		datasources: {
			db: {
				url: testDatabaseUrl,
			},
		},
	})
	console.log("✅ [setup.ts] PrismaClientを生成しました")
} else {
	console.log("♻️  [setup.ts] 既存のPrismaClientを再利用します")
}

const testPrisma = globalForPrisma.testPrisma

// 利用するprisma クライアントをテストデータベース用に更新
Object.assign(prisma, testPrisma)

export { testPrisma }
