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
export async function createTestExecutionUser(
	data: {
		user_name: string
		first_name?: string
		last_name?: string
		email?: string
		timezone?: string
		locale?: string
	},
	options: { withProfile?: boolean; withRole?: boolean } = {},
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
		const testProfile = await createTestProfile(
			user.id,
			`test_profile_${user.id}`,
		)

		const testRole = options.withRole
			? await createTestRole(user.id, `test_role_${user.id}`)
			: null

		await testPrisma.user_access_control.create({
			data: {
				user_id: user.id,
				profile_id: testProfile.id,
				role_id: testRole ? testRole.id : null,
				created_by: user.id,
				modified_by: user.id,
			},
		})
	}

	const token = createValidToken(user.id)

	return { ...user, access_token: token }
}

/**
 * テストユーザの一括作成
 */
export async function createTestUsers(
	testExecutionUserId: string,
	usersData: {
		user_name: string
		first_name?: string
		last_name?: string
		email?: string
		is_active?: boolean
		timezone?: string
		locale?: string
		profile_name?: string
		role_name?: string
	}[],
): Promise<{ count: number }> {
	const createdUsers = await testPrisma.user.createMany({
		data: usersData.map((data) => ({
			user_name: data.user_name,
			first_name: data.first_name ?? "",
			last_name: data.last_name ?? "",
			email: data.email ?? null,
			hashed_password: "test-password",
			is_active: data.is_active ?? true,
			timezone: data.timezone ?? null,
			locale: data.locale ?? null,
		})),
	})

	// プロファイルとロールとアクセスコントロールの作成
	const allUsers = await testPrisma.user.findMany({
		where: {
			user_name: {
				in: usersData.map((u) => u.user_name),
			},
		},
	})
	const userMap = new Map(allUsers.map((user) => [user.user_name, user]))
	const testProfileIds = new Map<string, string>()
	const testRoleIds = new Map<string, string>()

	for (const data of usersData) {
		const user = userMap.get(data.user_name)
		if (!user) continue

		if (data.profile_name || data.role_name) {
			// プロファイルを作成
			const profileName = data.profile_name ?? "test_profile"
			const profileId =
				testProfileIds.get(profileName) ??
				(await createTestProfile(testExecutionUserId, profileName)).id
			testProfileIds.set(profileName, profileId)

			// ロールを作成
			if (data.role_name) {
				const roleId =
					testRoleIds.get(data.role_name) ??
					(await createTestRole(testExecutionUserId, data.role_name)).id
				testRoleIds.set(data.role_name, roleId)
			}

			// プロファイルの作成
			await testPrisma.user_access_control.create({
				data: {
					user_id: user.id,
					profile_id: testProfileIds.get(profileName) as string,
					role_id: data.role_name ? testRoleIds.get(data.role_name) : undefined,
					created_by: testExecutionUserId,
					modified_by: testExecutionUserId,
				},
			})
		}
	}
	return createdUsers
}

/**
 * テストプロファイルの作成
 */
async function createTestProfile(userId: string, profileName: string) {
	return await testPrisma.profile.create({
		data: {
			name: profileName,
			display_name: "Test Profile",
			order: 999,
			created_by: userId,
			modified_by: userId,
		},
	})
}

/**
 * テストロールの作成
 */
async function createTestRole(userId: string, roleName: string) {
	return await testPrisma.role.create({
		data: {
			name: roleName,
			display_name: "Test Role",
			order: 999,
			created_by: userId,
			modified_by: userId,
		},
	})
}

/**
 * テスト実施ユーザーデータの削除（レコードID指定）
 *
 * アクセスコントロールとプロファイルとロールも自動的に削除されます
 */
export async function deleteTestExecutionUser(id: string) {
	// アクセスコントロールが存在する場合は削除
	const userAccessControls = await testPrisma.user_access_control.findMany({
		where: { user_id: id },
	})
	await testPrisma.user_access_control.deleteMany({
		where: { user_id: id },
	})

	// ロールが存在する場合は削除
	const roleIds = userAccessControls
		.filter((uac) => uac.role_id !== null)
		.map((uac) => uac.role_id as string)
	await testPrisma.role.deleteMany({
		where: { id: { in: roleIds } },
	})

	// プロファイルが存在する場合は削除
	const profileIds = userAccessControls
		.filter((uac) => uac.profile_id !== null)
		.map((uac) => uac.profile_id as string)
	await testPrisma.profile.deleteMany({
		where: { id: { in: profileIds } },
	})

	await testPrisma.user.delete({ where: { id } })
}

/**
 * テスト実施ユーザ以外のテストユーザーデータの一括削除
 *
 * アクセスコントロールとプロフィールとロールも自動的に削除されます
 */
export async function deleteTestUsers(testExecutionUserId: string) {
	const execUserAccessControls = await testPrisma.user_access_control.findMany({
		where: { user_id: testExecutionUserId },
	})

	// テスト実施ユーザと紐付かないアクセスコントロールを削除
	await testPrisma.user_access_control.deleteMany({
		where: { NOT: { user_id: testExecutionUserId } },
	})

	// テスト実施ユーザと紐付かないロールを削除
	await testPrisma.role.deleteMany({
		where: {
			NOT: {
				id: {
					in: execUserAccessControls
						.filter((uac) => uac.role_id !== null)
						.map((uac) => uac.role_id as string),
				},
			},
		},
	})

	// テスト実施ユーザと紐付かないプロフィールを削除
	await testPrisma.profile.deleteMany({
		where: {
			NOT: {
				id: {
					in: execUserAccessControls
						.filter((uac) => uac.profile_id !== null)
						.map((uac) => uac.profile_id),
				},
			},
		},
	})

	// テスト実施ユーザ以外のユーザを削除
	await testPrisma.user.deleteMany({
		where: { NOT: { id: testExecutionUserId } },
	})
}
