import { testPrisma } from "../setup"

/**
 * Clean up all test data from the database
 */
export async function cleanupTestData() {
	// 1. テーブル一覧を取得: Prismaが管理するテーブルを除外
	const tableNames = await testPrisma.$queryRaw<{ TABLE_NAME: string }[]>`
		SELECT TABLE_NAME
		FROM INFORMATION_SCHEMA.TABLES
		WHERE TABLE_TYPE = 'BASE TABLE'
		AND TABLE_SCHEMA = 'dbo'
		AND TABLE_NAME NOT LIKE '_prisma%'
		ORDER BY TABLE_NAME
	`

	// 2. 全テーブルの制約を一括無効化
	for (const table of tableNames) {
		await testPrisma.$executeRawUnsafe(
			`ALTER TABLE [${table.TABLE_NAME}] NOCHECK CONSTRAINT all`,
		)
	}

	// 3. データ削除: 各テーブルのデータを順次削除
	for (const table of tableNames) {
		await testPrisma.$executeRawUnsafe(`DELETE FROM [${table.TABLE_NAME}]`)
	}

	// 4. 全テーブルの制約を復元
	for (const table of tableNames) {
		await testPrisma.$executeRawUnsafe(
			`ALTER TABLE [${table.TABLE_NAME}] CHECK CONSTRAINT all`,
		)
	}
}

/**
 * Create a test user for tests
 */
export async function createTestUser(userData: {
	user_name: string
	first_name: string
	last_name: string
	email?: string
	timezone?: string
	locale?: string
}) {
	const user = await testPrisma.user.create({
		data: {
			user_name: `test_${userData.user_name}`,
			first_name: userData.first_name,
			last_name: userData.last_name,
			email: userData.email ?? null,
			hashed_password: "test-password-123", // Use a fixed password for testing purposes
			is_active: true,
			timezone: userData.timezone ?? null,
			locale: userData.locale ?? null,
		},
		select: {
			id: true,
			user_name: true,
			first_name: true,
			last_name: true,
			email: true,
			is_active: true,
			timezone: true,
			locale: true,
		},
	})

	// Create a new test profile for each user
	const testProfile = await createTestProfile(user.id)

	// Create user access control to link user with profile
	await testPrisma.user_access_control.create({
		data: {
			user_id: user.id,
			profile_id: testProfile.id,
			created_by: user.id,
			modified_by: user.id,
		},
	})

	return user
}

async function createTestProfile(userId: string) {
	// Generate unique profile name using userId to avoid conflicts
	const uniqueName = `test_profile_${userId.slice(0, 8)}`
	return await testPrisma.profile.create({
		data: {
			name: uniqueName,
			display_name: "Test Profile",
			order: 999,
			created_by: userId,
			modified_by: userId,
		},
	})
}
