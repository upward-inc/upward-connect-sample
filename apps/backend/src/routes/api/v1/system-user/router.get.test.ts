import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { app } from "../../../../index"
import {
	cleanupEntityMetadata,
	setupEntityMetadata,
} from "../../../../test/utils/entity"
import {
	createTestExecutionUser,
	createTestUsers,
	deleteTestExecutionUser,
	deleteTestUsers,
	type TestExecutionUser,
} from "../../../../test/utils/execution-user"
import { generateQueryString } from "../../../../test/utils/query-string"

describe("GET /api/v1/system-users - システムユーザー一覧取得", () => {
	// テスト実施ユーザー
	let testExecutionUser: TestExecutionUser

	beforeAll(async () => {
		const taskId = crypto.randomUUID()
		const { user } = await setup(taskId)
		testExecutionUser = user
	})

	afterAll(async () => {
		await cleanup()
	})

	afterEach(async () => {
		// テスト毎に対象データを削除
		await deleteTestUsers(testExecutionUser.id)
	})

	// テストデータのセットアップ
	async function setup(taskId: string) {
		// テスト実施ユーザーの作成
		const user = await createTestExecutionUser(
			{
				user_name: taskId,
			},
			{ withProfile: true },
		)

		// エンティティ関連データの作成
		await setupEntityMetadata(user)

		return { user }
	}

	// テストデータのクリーンアップ
	async function cleanup() {
		// エンティティ関連データのクリーンアップ
		await cleanupEntityMetadata()
		// テスト実施ユーザーの削除
		await deleteTestExecutionUser(testExecutionUser.id)
	}

	/**
	 * システムユーザー一覧APIへのGETリクエストを送信する
	 */
	async function requestGetList(
		params: {
			fields: string
			filter?: object
			order_by?: object
			limit?: number
			offset?: number
		},
		authToken = testExecutionUser.access_token,
	) {
		// テスト実施ユーザはテスト実行時に動的に作成される管理ユーザであり、
		// 各テストケースで用意されるベタ書きの静的テストデータとは異なる性質を持つため、
		// 検証対象の結果に含めるとテストの意図と異なる結果になることを防ぐために除外する
		const filterWithExecutionUserExcluded = {
			and: [
				{
					field: "user_name",
					operator: "eq",
					value: testExecutionUser.user_name,
					is_not: true,
				},
				...(params.filter ? [params.filter] : []),
			],
		}
		params.filter = filterWithExecutionUserExcluded
		const queryString = generateQueryString(params)
		return await app.request(`/api/v1/system-users${queryString}`, {
			method: "GET",
			headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
		})
	}

	/**
	 * システムユーザー個別取得APIへのGETリクエストを送信する
	 */
	async function requestGetById(
		userId: string,
		authToken = testExecutionUser.access_token,
	) {
		return await app.request(`/api/v1/system-users/${userId}`, {
			method: "GET",
			headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
		})
	}

	/**
	 * filterパラメータのテストケースを生成するヘルパー関数
	 *
	 * 渡されたテストケースに対して、`is_not: true`のテストケースを追加して返却
	 */
	function generateFilterTestCases<T extends { user_name: string }>(
		testUsers: T[],
		baseTestCases: Array<{
			title: string
			operator: string
			value?: unknown
			expected: { data: { user_name: string }[] }
		}>,
	) {
		return baseTestCases.flatMap((testCase) => {
			return [
				// 通常のテストケース
				{
					...testCase,
					is_not: undefined,
				},
				// `is_not: true`のテストケース
				{
					...testCase,
					title: `${testCase.title} + is_not=true`,
					is_not: true,
					// `expected.data`に含まれないレコードが`is_not: true`時の期待値となる
					expected: {
						data: testUsers
							.filter((user) => {
								return !testCase.expected.data.some((expected) => {
									return expected.user_name === user.user_name
								})
							})
							.map((user) => ({ user_name: user.user_name })),
					},
				},
			]
		})
	}

	describe("GET /api/v1/system-users - 一覧取得", () => {
		it("認証ヘッダーがない場合に401エラーを返すこと", async () => {
			// Act
			const response = await requestGetList({ fields: "id" }, "")

			// Assert
			const json = await response.json()
			expect(response.status).toBe(401)
			expect(json).toHaveProperty("message")
		})

		it("リクエストが正常に処理された場合、200ステータスを返すこと", async () => {
			// Act
			const response = await requestGetList({ fields: "id" })

			// Assert
			expect(response.status).toBe(200)
		})

		it("リクエストが正常に処理された場合のレスポンスの構造が正しいこと", async () => {
			// Act
			const response = await requestGetList({ fields: "id" })

			// Assert
			const { has_next_page, total_size, data } = await response.json()

			expect(typeof has_next_page).toBe("boolean")
			expect(typeof total_size).toBe("number")
			expect(Array.isArray(data)).toBe(true)
		})

		describe("fieldsパラメータ", () => {
			const testUser = {
				user_name: "test_user_fields",
				first_name: "Test",
				last_name: "User",
				email: "test_user_fields@example.com",
				locale: "ja-JP",
				timezone: "Asia/Tokyo",
				profile_name: "test_profile_fields",
				role_name: "test_role_fields",
			}
			it.each([
				{
					title: "userのフィールドのみ",
					fields: "id,user_name,first_name,last_name,email,locale,timezone",
					expected: {
						id: "", // idは動的に生成されるため後で指定
						user_name: testUser.user_name,
						first_name: testUser.first_name,
						last_name: testUser.last_name,
						email: testUser.email,
						locale: testUser.locale,
						timezone: testUser.timezone,
					},
				},
				{
					title: "profileのフィールドのみ",
					fields: "profile_name",
					expected: { profile_name: testUser.profile_name },
				},
				{
					title: "roleのフィールドのみ",
					fields: "role_name",
					expected: { role_name: testUser.role_name },
				},
				{
					title: "全フィールドを含む",
					fields:
						"id,user_name,first_name,last_name,email,locale,timezone,profile_name,role_name",
					expected: {
						id: "", // idは動的に生成されるため後で指定
						user_name: testUser.user_name,
						first_name: testUser.first_name,
						last_name: testUser.last_name,
						email: testUser.email,
						locale: testUser.locale,
						timezone: testUser.timezone,
						profile_name: testUser.profile_name,
						role_name: testUser.role_name,
					},
				},
				{
					title: "存在しないフィールドを含む",
					fields: "id,profile_name,invalid_field",
					expected: {
						id: "", // idは動的に生成されるため後で指定
						profile_name: testUser.profile_name,
						invalid_field: null,
					},
				},
			])("$title", async ({ fields, expected }) => {
				// Arrange
				const target = await createTestExecutionUser(testUser, {
					withProfile: true,
					withRole: true,
				})
				if ("id" in expected) {
					expected.id = target.id // 動的に生成されるidをセット
				}

				// Act
				const response = await requestGetList({
					fields,
				})

				// Assert
				const { data } = await response.json()
				expect(data).toStrictEqual([expected])
			})
		})

		describe("filterパラメータ", () => {
			describe("userのフィールドによる絞り込み", () => {
				const targetField = "email"
				const testUsers = [
					{ user_name: "User 1", email: "A@AA.com" },
					{ user_name: "User 2", email: "B@AA.com" },
					{ user_name: "User 3", email: "B@AA.jp" },
					{ user_name: "User 4", email: "B@BB.com" },
					{ user_name: "User 5" },
				]

				const baseTestCases = [
					{
						title: "eq",
						operator: "eq",
						value: "A@AA.com",
						expected: { data: [{ user_name: "User 1" }] },
					},
					{
						title: "like (contains)",
						operator: "like",
						value: "%AA%",
						expected: {
							data: [
								{ user_name: "User 1" },
								{ user_name: "User 2" },
								{ user_name: "User 3" },
							],
						},
					},
					{
						title: "like (starts_with)",
						operator: "like",
						value: "B@%",
						expected: {
							data: [
								{ user_name: "User 2" },
								{ user_name: "User 3" },
								{ user_name: "User 4" },
							],
						},
					},
					{
						title: "like (ends_with)",
						operator: "like",
						value: "%.com",
						expected: {
							data: [
								{ user_name: "User 1" },
								{ user_name: "User 2" },
								{ user_name: "User 4" },
							],
						},
					},
					{
						// 複数のワイルドカードを使用して、文字が順序通りに出現することを確認
						title: "like (順序検索)",
						operator: "like",
						value: "%AA%com%",
						expected: {
							data: [{ user_name: "User 1" }, { user_name: "User 2" }],
						},
					},
					{
						title: "gt",
						operator: "gt",
						value: "B@AA.com",
						expected: {
							data: [{ user_name: "User 3" }, { user_name: "User 4" }],
						},
					},
					{
						title: "gte",
						operator: "gte",
						value: "B@AA.com",
						expected: {
							data: [
								{ user_name: "User 2" },
								{ user_name: "User 3" },
								{ user_name: "User 4" },
							],
						},
					},
					{
						title: "lt",
						operator: "lt",
						value: "B@AA.com",
						expected: {
							data: [{ user_name: "User 1" }],
						},
					},
					{
						title: "lte",
						operator: "lte",
						value: "B@AA.com",
						expected: {
							data: [{ user_name: "User 1" }, { user_name: "User 2" }],
						},
					},
					{
						title: "is_set",
						operator: "is_set",
						value: true,
						expected: {
							data: [
								{ user_name: "User 1" },
								{ user_name: "User 2" },
								{ user_name: "User 3" },
								{ user_name: "User 4" },
							],
						},
					},
				]

				const testCases = generateFilterTestCases(testUsers, baseTestCases)

				it.each(testCases)("$title", async ({
					operator,
					value,
					is_not,
					expected,
				}) => {
					// Arrange
					await createTestUsers(testExecutionUser.id, testUsers)

					// Act
					const response = await requestGetList({
						fields: "user_name",
						filter: {
							and: [{ field: targetField, operator, value, is_not }],
						},
					})

					// Assert
					const { data } = await response.json()
					expect(data).toStrictEqual(expected.data)
				})
			})

			describe("profileのフィールドによる絞り込み", () => {
				const targetField = "profile_name"
				const testUsers = [
					{ user_name: "User 1", profile_name: "A AA A" },
					{ user_name: "User 2", profile_name: "B AA A" },
					{ user_name: "User 3", profile_name: "B AA B" },
					{ user_name: "User 4", profile_name: "B BB A" },
					{ user_name: "User 5" },
				]

				const baseTestCases = [
					{
						title: "eq",
						operator: "eq",
						value: "A AA A",
						expected: { data: [{ user_name: "User 1" }] },
					},
					{
						title: "like (contains)",
						operator: "like",
						value: "%AA%",
						expected: {
							data: [
								{ user_name: "User 1" },
								{ user_name: "User 2" },
								{ user_name: "User 3" },
							],
						},
					},
					{
						title: "like (starts_with)",
						operator: "like",
						value: "B%",
						expected: {
							data: [
								{ user_name: "User 2" },
								{ user_name: "User 3" },
								{ user_name: "User 4" },
							],
						},
					},
					{
						title: "like (ends_with)",
						operator: "like",
						value: "%A",
						expected: {
							data: [
								{ user_name: "User 1" },
								{ user_name: "User 2" },
								{ user_name: "User 4" },
							],
						},
					},
					{
						// 複数のワイルドカードを使用して、文字が順序通りに出現することを確認
						title: "like (順序検索)",
						operator: "like",
						value: "%AA%A%",
						expected: {
							data: [{ user_name: "User 1" }, { user_name: "User 2" }],
						},
					},
					{
						title: "gt",
						operator: "gt",
						value: "B AA A",
						expected: {
							data: [{ user_name: "User 3" }, { user_name: "User 4" }],
						},
					},
					{
						title: "gte",
						operator: "gte",
						value: "B AA A",
						expected: {
							data: [
								{ user_name: "User 2" },
								{ user_name: "User 3" },
								{ user_name: "User 4" },
							],
						},
					},
					{
						title: "lt",
						operator: "lt",
						value: "B AA A",
						expected: {
							data: [{ user_name: "User 1" }],
						},
					},
					{
						title: "lte",
						operator: "lte",
						value: "B AA A",
						expected: {
							data: [{ user_name: "User 1" }, { user_name: "User 2" }],
						},
					},
					{
						title: "is_set",
						operator: "is_set",
						value: true,
						expected: {
							data: [
								{ user_name: "User 1" },
								{ user_name: "User 2" },
								{ user_name: "User 3" },
								{ user_name: "User 4" },
							],
						},
					},
				]

				const testCases = generateFilterTestCases(testUsers, baseTestCases)

				it.each(testCases)("$title", async ({
					operator,
					value,
					is_not,
					expected,
				}) => {
					// Arrange
					await createTestUsers(testExecutionUser.id, testUsers)

					// Act
					const response = await requestGetList({
						fields: "user_name",
						filter: {
							and: [{ field: targetField, operator, value, is_not }],
						},
					})

					// Assert
					const { data } = await response.json()
					expect(data).toStrictEqual(expected.data)
				})
			})

			describe("roleのフィールドによる絞り込み", () => {
				const targetField = "role_name"
				const testUsers = [
					{ user_name: "User 1", role_name: "A AA A" },
					{ user_name: "User 2", role_name: "B AA A" },
					{ user_name: "User 3", role_name: "B AA B" },
					{ user_name: "User 4", role_name: "B BB A" },
					{ user_name: "User 5" },
				]

				const baseTestCases = [
					{
						title: "eq",
						operator: "eq",
						value: "A AA A",
						expected: { data: [{ user_name: "User 1" }] },
					},
					{
						title: "like (contains)",
						operator: "like",
						value: "%AA%",
						expected: {
							data: [
								{ user_name: "User 1" },
								{ user_name: "User 2" },
								{ user_name: "User 3" },
							],
						},
					},
					{
						title: "like (starts_with)",
						operator: "like",
						value: "B%",
						expected: {
							data: [
								{ user_name: "User 2" },
								{ user_name: "User 3" },
								{ user_name: "User 4" },
							],
						},
					},
					{
						title: "like (ends_with)",
						operator: "like",
						value: "%A",
						expected: {
							data: [
								{ user_name: "User 1" },
								{ user_name: "User 2" },
								{ user_name: "User 4" },
							],
						},
					},
					{
						// 複数のワイルドカードを使用して、文字が順序通りに出現することを確認
						title: "like (順序検索)",
						operator: "like",
						value: "%AA%A%",
						expected: {
							data: [{ user_name: "User 1" }, { user_name: "User 2" }],
						},
					},
					{
						title: "gt",
						operator: "gt",
						value: "B AA A",
						expected: {
							data: [{ user_name: "User 3" }, { user_name: "User 4" }],
						},
					},
					{
						title: "gte",
						operator: "gte",
						value: "B AA A",
						expected: {
							data: [
								{ user_name: "User 2" },
								{ user_name: "User 3" },
								{ user_name: "User 4" },
							],
						},
					},
					{
						title: "lt",
						operator: "lt",
						value: "B AA A",
						expected: {
							data: [{ user_name: "User 1" }],
						},
					},
					{
						title: "lte",
						operator: "lte",
						value: "B AA A",
						expected: {
							data: [{ user_name: "User 1" }, { user_name: "User 2" }],
						},
					},
					{
						title: "is_set",
						operator: "is_set",
						value: true,
						expected: {
							data: [
								{ user_name: "User 1" },
								{ user_name: "User 2" },
								{ user_name: "User 3" },
								{ user_name: "User 4" },
							],
						},
					},
				]

				const testCases = generateFilterTestCases(testUsers, baseTestCases)

				it.each(testCases)("$title", async ({
					operator,
					value,
					is_not,
					expected,
				}) => {
					// Arrange
					await createTestUsers(testExecutionUser.id, testUsers)

					// Act
					const response = await requestGetList({
						fields: "user_name",
						filter: {
							and: [{ field: targetField, operator, value, is_not }],
						},
					})

					// Assert
					const { data } = await response.json()
					expect(data).toStrictEqual(expected.data)
				})
			})

			describe("存在しないフィールドによる絞り込み", () => {
				it("無視され、全データが返されること", async () => {
					// Arrange
					const testUsers = [{ user_name: "User 1" }, { user_name: "User 2" }]
					await createTestUsers(testExecutionUser.id, testUsers)

					// Act
					const response = await requestGetList({
						fields: "user_name",
						filter: {
							and: [
								{
									field: "invalid_field",
									operator: "eq",
									value: "some_value",
								},
							],
						},
					})

					// Assert
					const { data } = await response.json()
					expect(data).toStrictEqual([
						{ user_name: "User 1" },
						{ user_name: "User 2" },
					])
				})
			})
		})

		describe("order_byパラメータ", () => {
			const testUsers = [
				{
					user_name: "User 1",
					first_name: "AA",
					last_name: "ZZ",
					profile_name: "Profile A",
					role_name: "Role A",
				},
				{
					user_name: "User 2",
					first_name: "BB",
					last_name: "YY",
					profile_name: "Profile A",
					role_name: "Role B",
				},
				{
					user_name: "User 3",
					first_name: "CC",
					last_name: "XX",
					profile_name: "Profile B",
					role_name: "Role A",
				},
				{
					user_name: "User 4",
					first_name: "DD",
					last_name: "WW",
					profile_name: "Profile B",
					role_name: "Role B",
				},
				{
					user_name: "User 5",
					first_name: "AA",
					last_name: "ZZ",
					profile_name: "Profile A",
				},
				{ user_name: "User 6", first_name: "BB", last_name: "YY" },
			]
			describe("userのフィールドで並び替えられること", () => {
				it.each([
					{
						title: "単一条件",
						order_by: [{ field: "first_name", direction: "desc" }],
						expected: {
							data: [
								{ user_name: "User 4" },
								{ user_name: "User 3" },
								{ user_name: "User 2" },
								{ user_name: "User 6" },
								{ user_name: "User 1" },
								{ user_name: "User 5" },
							],
						},
					},
					{
						title: "複数条件",
						order_by: [
							{ field: "first_name", direction: "asc" },
							{ field: "last_name", direction: "desc" },
						],
						expected: {
							data: [
								{ user_name: "User 1" },
								{ user_name: "User 5" },
								{ user_name: "User 2" },
								{ user_name: "User 6" },
								{ user_name: "User 3" },
								{ user_name: "User 4" },
							],
						},
					},
				])("$title", async ({ order_by, expected }) => {
					// Arrange
					await createTestUsers(testExecutionUser.id, testUsers)

					// Act
					const response = await requestGetList({
						fields: "user_name",
						order_by,
					})

					// Assert
					const { data } = await response.json()
					expect(data).toStrictEqual(expected.data)
				})
			})

			describe("profileのフィールドで並び替えられること", () => {
				it.each([
					{
						title: "単一条件",
						order_by: [{ field: "profile_name", direction: "desc" }],
						expected: {
							data: [
								{ user_name: "User 3", profile_name: "Profile B" },
								{ user_name: "User 4", profile_name: "Profile B" },
								{ user_name: "User 1", profile_name: "Profile A" },
								{ user_name: "User 2", profile_name: "Profile A" },
								{ user_name: "User 5", profile_name: "Profile A" },
								{ user_name: "User 6", profile_name: null },
							],
						},
					},
				])("$title", async ({ order_by, expected }) => {
					// Arrange
					await createTestUsers(testExecutionUser.id, testUsers)

					// Act
					const response = await requestGetList({
						fields: `user_name,${order_by.map((o) => o.field).join(",")}`,
						order_by,
					})

					// Assert
					const { data } = await response.json()
					expect(data).toStrictEqual(expected.data)
				})
			})

			describe("roleのフィールドで並び替えられること", () => {
				it.each([
					{
						title: "単一条件",
						order_by: [{ field: "role_name", direction: "desc" }],
						expected: {
							data: [
								{ user_name: "User 2", role_name: "Role B" },
								{ user_name: "User 4", role_name: "Role B" },
								{ user_name: "User 1", role_name: "Role A" },
								{ user_name: "User 3", role_name: "Role A" },
								{ user_name: "User 5", role_name: null },
								{ user_name: "User 6", role_name: null },
							],
						},
					},
				])("$title", async ({ order_by, expected }) => {
					// Arrange
					await createTestUsers(testExecutionUser.id, testUsers)

					// Act
					const response = await requestGetList({
						fields: `user_name,${order_by.map((o) => o.field).join(",")}`,
						order_by,
					})

					// Assert
					const { data } = await response.json()
					expect(data).toStrictEqual(expected.data)
				})
			})

			describe("複数対象のフィールドで並び替えられること", () => {
				it.each([
					{
						title: "userとprofileのフィールド",
						order_by: [
							{ field: "first_name", direction: "asc" },
							{ field: "profile_name", direction: "desc" },
						],
						expected: {
							data: [
								{
									user_name: "User 1",
									first_name: "AA",
									profile_name: "Profile A",
								},
								{
									user_name: "User 5",
									first_name: "AA",
									profile_name: "Profile A",
								},
								{
									user_name: "User 2",
									first_name: "BB",
									profile_name: "Profile A",
								},
								{ first_name: "BB", profile_name: null, user_name: "User 6" },
								{
									user_name: "User 3",
									first_name: "CC",
									profile_name: "Profile B",
								},
								{
									user_name: "User 4",
									first_name: "DD",
									profile_name: "Profile B",
								},
							],
						},
					},
					{
						title: "userとroleのフィールド",
						order_by: [
							{ field: "first_name", direction: "asc" },
							{ field: "role_name", direction: "desc" },
						],
						expected: {
							data: [
								{ user_name: "User 1", first_name: "AA", role_name: "Role A" },
								{ user_name: "User 5", first_name: "AA", role_name: null },
								{ user_name: "User 2", first_name: "BB", role_name: "Role B" },
								{ user_name: "User 6", first_name: "BB", role_name: null },
								{ user_name: "User 3", first_name: "CC", role_name: "Role A" },
								{ user_name: "User 4", first_name: "DD", role_name: "Role B" },
							],
						},
					},
					{
						title: "profileとroleのフィールド",
						order_by: [
							{ field: "profile_name", direction: "asc" },
							{ field: "role_name", direction: "desc" },
						],
						expected: {
							data: [
								{ user_name: "User 6", profile_name: null, role_name: null },
								{
									user_name: "User 2",
									profile_name: "Profile A",
									role_name: "Role B",
								},
								{
									user_name: "User 1",
									profile_name: "Profile A",
									role_name: "Role A",
								},
								{
									user_name: "User 5",
									profile_name: "Profile A",
									role_name: null,
								},
								{
									user_name: "User 4",
									profile_name: "Profile B",
									role_name: "Role B",
								},
								{
									user_name: "User 3",
									profile_name: "Profile B",
									role_name: "Role A",
								},
							],
						},
					},
				])("$title", async ({ order_by, expected }) => {
					// Arrange
					await createTestUsers(testExecutionUser.id, testUsers)

					// Act
					const response = await requestGetList({
						fields: `user_name,${order_by.map((o) => o.field).join(",")}`,
						order_by,
					})

					// Assert
					const { data } = await response.json()
					expect(data).toStrictEqual(expected.data)
				})
			})
		})

		describe("limitパラメータ", () => {
			describe("指定した数を上限に対象ユーザーを返すこと", () => {
				const testUsers = [
					{ user_name: "User 1" },
					{ user_name: "User 2" },
					{ user_name: "User 3" },
					{ user_name: "User 4" },
					{ user_name: "User 5" },
				]

				it.each([
					{
						title: "limit < 対象ユーザー数",
						limit: 2,
						expected: {
							has_next_page: true,
							total_size: 5,
							data: [{ user_name: "User 1" }, { user_name: "User 2" }],
						},
					},
					{
						title: "limit = 対象ユーザー数",
						limit: 5,
						expected: {
							has_next_page: false,
							total_size: 5,
							data: [
								{ user_name: "User 1" },
								{ user_name: "User 2" },
								{ user_name: "User 3" },
								{ user_name: "User 4" },
								{ user_name: "User 5" },
							],
						},
					},
					{
						title: "limit > 対象ユーザー数",
						limit: 6,
						expected: {
							has_next_page: false,
							total_size: 5,
							data: [
								{ user_name: "User 1" },
								{ user_name: "User 2" },
								{ user_name: "User 3" },
								{ user_name: "User 4" },
								{ user_name: "User 5" },
							],
						},
					},
				])("$title", async ({ limit, expected }) => {
					// Arrange
					await createTestUsers(testExecutionUser.id, testUsers)

					// Act
					const response = await requestGetList({
						fields: "user_name",
						limit,
					})

					// Assert
					const json = await response.json()
					expect(json.has_next_page).toBe(expected.has_next_page)
					expect(json.total_size).toBe(expected.total_size)
					expect(json.data).toStrictEqual(expected.data)
				})
			})
		})

		describe("limitパラメータ + offsetパラメータ", () => {
			describe("指定した範囲の対象ユーザーを返すこと", () => {
				const testUsers = [
					{ user_name: "User 1" },
					{ user_name: "User 2" },
					{ user_name: "User 3" },
					{ user_name: "User 4" },
					{ user_name: "User 5" },
				]
				it.each([
					{
						title: "(limit + offset) < 対象ユーザー数",
						limit: 2,
						offset: 1,
						expected: {
							has_next_page: true,
							total_size: 5,
							data: [{ user_name: "User 2" }, { user_name: "User 3" }],
						},
					},
					{
						title: "(limit + offset) = 対象ユーザー数",
						limit: 3,
						offset: 2,
						expected: {
							has_next_page: false,
							total_size: 5,
							data: [
								{ user_name: "User 3" },
								{ user_name: "User 4" },
								{ user_name: "User 5" },
							],
						},
					},
					{
						title: "(limit + offset) > 対象ユーザー数",
						limit: 3,
						offset: 3,
						expected: {
							has_next_page: false,
							total_size: 5,
							data: [{ user_name: "User 4" }, { user_name: "User 5" }],
						},
					},
					{
						title: "offset >= 対象ユーザー数",
						limit: 3,
						offset: 5,
						expected: {
							has_next_page: false,
							total_size: 5,
							data: [],
						},
					},
				])("$title", async ({ limit, offset, expected }) => {
					// Arrange
					await createTestUsers(testExecutionUser.id, testUsers)

					// Act
					const response = await requestGetList({
						fields: "user_name",
						limit,
						offset,
					})

					// Assert
					const json = await response.json()
					expect(json.has_next_page).toBe(expected.has_next_page)
					expect(json.total_size).toBe(expected.total_size)
					expect(json.data).toStrictEqual(expected.data)
				})
			})
		})
	})

	describe("GET /api/v1/system-users/:id - 個別取得", () => {
		it("指定したIDのシステムユーザー情報を正常に取得できること", async () => {
			// Act
			const response = await requestGetById(testExecutionUser.id)

			// Assert
			expect(response.status).toBe(200)
			const data = await response.json()
			expect(data.id).toBe(testExecutionUser.id)
			expect(data.user_name).toBe(testExecutionUser.user_name)
			expect(data.first_name).toBe(testExecutionUser.first_name)
			expect(data.last_name).toBe(testExecutionUser.last_name)
		})

		it("レスポンスに必要なプロパティが含まれること", async () => {
			// Act
			const response = await requestGetById(testExecutionUser.id)

			// Assert
			const data = await response.json()
			expect(data).toHaveProperty("profile_name")
			expect(data).toHaveProperty("timezone")
			expect(data).toHaveProperty("locale")
			expect(data).toHaveProperty("role_name")
			expect(data).toHaveProperty("is_active")
			expect(data).toHaveProperty("created_at")
			expect(data).toHaveProperty("modified_at")
		})

		it("存在しないユーザーIDを指定した場合に404エラーを返すこと", async () => {
			// Arrange
			const nonExistentId = crypto.randomUUID()

			// Act
			const response = await requestGetById(nonExistentId)

			// Assert
			const json = await response.json()
			expect(response.status).toBe(404)
			expect(json).toHaveProperty("message")
		})
	})
})
