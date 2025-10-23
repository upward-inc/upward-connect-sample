import { testPrisma } from "../setup"
import { createValidToken } from "./auth"

export type TestExecutionUser = Awaited<
	ReturnType<typeof testPrisma.user.create>
> & {
	access_token: string
}

/**
 * テスト実施ユーザーの作成
 */
export async function createTestExecutionUser(data: {
	user_name: string
	first_name?: string
	last_name?: string
	email?: string
	timezone?: string
	locale?: string
}): Promise<TestExecutionUser> {
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

	const token = createValidToken(user.id)

	return { ...user, access_token: token }
}

/**
 * テスト実施ユーザーデータの削除（レコードID指定）
 */
export async function deleteTestExecutionUser(id: string) {
	await testPrisma.user.delete({ where: { id } })
}
