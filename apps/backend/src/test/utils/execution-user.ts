import { testPrisma } from "../setup"
import { createValidToken } from "./auth"

export type TestExecutionUser = Awaited<
	ReturnType<typeof testPrisma.user.create>
> & {
	access_token: string
}

let testProfile: { id: string } | null = null

/**
 * テスト実施ユーザーの作成
 */
export async function createTestExecutionUser(
	data: {
		user_name: string
		first_name?: string
		last_name?: string
		email?: string
		timezone?: string
		locale?: string
	},
	options: { withProfile?: boolean } = {},
): Promise<TestExecutionUser> {
	const user = await testPrisma.user.create({
		data: {
			user_name: data.user_name,
			first_name: data.first_name ?? "",
			last_name: data.last_name ?? "",
			email: data.email ?? null,
			hashed_password: "test-password",
			is_active: true,
			timezone: data.timezone ?? null,
			locale: data.locale ?? null,
		},
	})

	// プロファイルとアクセスコントロールの作成
	if (options.withProfile) {
		if (!testProfile) {
			testProfile = await createTestProfile(user.id)
		}

		await testPrisma.user_access_control.create({
			data: {
				user_id: user.id,
				profile_id: testProfile.id,
				created_by: user.id,
				modified_by: user.id,
			},
		})
	}

	const token = createValidToken(user.id)

	return { ...user, access_token: token }
}

/**
 * テストプロファイルの作成
 */
async function createTestProfile(userId: string) {
	return await testPrisma.profile.create({
		data: {
			name: "test_profile",
			display_name: "Test Profile",
			order: 999,
			created_by: userId,
			modified_by: userId,
		},
	})
}

/**
 * テスト実施ユーザーデータの削除（レコードID指定）
 *
 * アクセスコントロールとプロファイルも自動的に削除されます
 */
export async function deleteTestExecutionUser(id: string) {
	// アクセスコントロールが存在する場合は削除
	await testPrisma.user_access_control.deleteMany({
		where: { user_id: id },
	})

	// プロファイルが存在する場合は削除
	if (testProfile) {
		await testPrisma.profile.deleteMany({
			where: { name: "test_profile" },
		})
		testProfile = null
	}

	await testPrisma.user.delete({ where: { id } })
}

/**
 * テストプロファイルのクリーンアップ
 *
 * 全テスト終了後に一度だけ呼び出す
 */
export async function cleanupTestProfile() {
	if (testProfile) {
		await testPrisma.profile.deleteMany({
			where: { name: "test_profile" },
		})
		testProfile = null
	}
}
