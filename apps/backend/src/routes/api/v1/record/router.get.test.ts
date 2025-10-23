import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { app } from "../../../../index"
import {
	cleanupEntityMetadata,
	setupEntityMetadata,
} from "../../../../test/utils/entity"
import {
	type TestExecutionUser,
	createTestExecutionUser,
	deleteTestExecutionUser,
} from "../../../../test/utils/execution-user"
import { generateQueryString } from "../../../../test/utils/query-string"
import {
	createManyTestSamples,
	createTestSample,
	deleteAllTestSamples,
} from "../../../../test/utils/record"

describe("GET /records/:entity_name - レコード一覧取得（検索）", () => {
	// テスト実施ユーザー
	let testExecutionUser: TestExecutionUser

	beforeAll(async ({ id: taskId }) => {
		const { user } = await setup(taskId)
		testExecutionUser = user
	})

	afterAll(async () => {
		await cleanup()
	})

	afterEach(async () => {
		// テスト毎に対象データを削除
		await deleteAllTestSamples()
	})

	// テストデータのセットアップ
	async function setup(taskId: string) {
		// テスト実施ユーザーの作成
		const user = await createTestExecutionUser({ user_name: taskId })

		// エンティティ関連データの作成
		await setupEntityMetadata(user)

		return { user }
	}

	// テストデータのクリーンアップ
	async function cleanup() {
		await cleanupEntityMetadata()
		await deleteTestExecutionUser(testExecutionUser.id)
	}

	/**
	 * レコードAPIへのGETリクエストを送信する
	 */
	async function requestGet(
		entityName: string,
		params: {
			fields?: string
			filter?: object
			group_by?: string
			order_by?: object
			limit?: number
			offset?: number
		},
		authToken = testExecutionUser.access_token,
	) {
		const queryString = generateQueryString(params)

		return await app.request(`/api/v1/records/${entityName}${queryString}`, {
			method: "GET",
			headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
		})
	}

	/**
	 * filterパラメータのテストケースを生成するヘルパー関数
	 *
	 * 渡されたテストケースに対して、`is_not: true`のテストケースを追加して返却
	 */
	function generateFilterTestCases<T extends { name: string }>(
		testRecords: T[],
		baseTestCases: Array<{
			title: string
			operator: string
			value?: unknown
			expected: { data: Array<{ name: string }> }
		}>,
	) {
		const allRecordNames = testRecords.map(({ name }) => ({ name }))

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
						data: allRecordNames.filter(({ name }) => {
							return !testCase.expected.data.some((expected) => {
								return expected.name === name
							})
						}),
					},
				},
			]
		})
	}

	it("認証ヘッダーがない場合に401エラーを返すこと", async () => {
		// Act
		const response = await requestGet("sample", { fields: "id" }, "")

		// Assert
		const json = await response.json()
		expect(response.status).toBe(401)
		expect(json).toHaveProperty("message")
	})

	it("リクエストが正常に処理された場合、200ステータスを返すこと", async () => {
		// Act
		const response = await requestGet("sample", { fields: "id" })

		// Assert
		expect(response.status).toBe(200)
	})

	it("リクエストが正常に処理された場合のレスポンスの構造が正しいこと", async () => {
		// Act
		const response = await requestGet("sample", { fields: "id" })

		// Assert
		const { has_next_page, total_size, data } = await response.json()

		expect(typeof has_next_page).toBe("boolean")
		expect(typeof total_size).toBe("number")
		expect(Array.isArray(data)).toBe(true)
	})

	describe("fieldsパラメータ", () => {
		it("指定した項目の値のみ取得されること", async () => {
			// Arrange
			const target = await createTestSample(testExecutionUser.id, {
				name: "Sample to Get",
				text: "Sample Text",
				integer: 123,
				boolean: true,
			})

			// Act
			const response = await requestGet("sample", { fields: "id,name,text" })

			// Assert
			const { data } = await response.json()
			expect(data).toStrictEqual([
				{
					id: target.id,
					name: target.name,
					text: target.text,
				},
			])
		})
	})

	describe("filterパラメータ", () => {
		describe("項目データ型毎の検索が正常に動作すること", () => {
			describe("text型", async () => {
				const targetField = "text"
				const testRecords = [
					{ name: "Record 1", text: "prefix A / text A-1 / suffix A" },
					{ name: "Record 2", text: "prefix A / text A-2 / suffix A" },
					{ name: "Record 3", text: "prefix B / text B-1 / suffix B" },
					{ name: "Record 4", text: "prefix B / text B-2 / suffix B" },
					{ name: "Record 5", text: "prefix C / text C-1 / suffix C" },
					{ name: "Record 6", text: "prefix C / text C-2 / suffix C" },
					{ name: "Record 7", text: "" },
					{ name: "Record 8", text: null },
				]

				const baseTestCases = [
					{
						title: "eq",
						operator: "eq",
						value: "prefix A / text A-1 / suffix A",
						expected: { data: [{ name: "Record 1" }] },
					},
					{
						title: "contains",
						operator: "contains",
						value: "text B",
						expected: { data: [{ name: "Record 3" }, { name: "Record 4" }] },
					},
					{
						title: "starts_with",
						operator: "starts_with",
						value: "prefix A",
						expected: { data: [{ name: "Record 1" }, { name: "Record 2" }] },
					},
					{
						title: "ends_with",
						operator: "ends_with",
						value: "suffix B",
						expected: { data: [{ name: "Record 3" }, { name: "Record 4" }] },
					},
					{
						title: "gt",
						operator: "gt",
						value: "prefix B / text B-2 / suffix B",
						expected: { data: [{ name: "Record 5" }, { name: "Record 6" }] },
					},
					{
						title: "gte",
						operator: "gte",
						value: "prefix B / text B-2 / suffix B",
						expected: {
							data: [
								{ name: "Record 4" },
								{ name: "Record 5" },
								{ name: "Record 6" },
							],
						},
					},
					{
						title: "lt",
						operator: "lt",
						value: "prefix B / text B-2 / suffix B",
						expected: {
							data: [
								{ name: "Record 1" },
								{ name: "Record 2" },
								{ name: "Record 3" },
								{ name: "Record 7" },
							],
						},
					},
					{
						title: "lte",
						operator: "lte",
						value: "prefix B / text B-2 / suffix B",
						expected: {
							data: [
								{ name: "Record 1" },
								{ name: "Record 2" },
								{ name: "Record 3" },
								{ name: "Record 4" },
								{ name: "Record 7" },
							],
						},
					},
					{
						title: "is_set",
						operator: "is_set",
						expected: {
							data: [
								{ name: "Record 1" },
								{ name: "Record 2" },
								{ name: "Record 3" },
								{ name: "Record 4" },
								{ name: "Record 5" },
								{ name: "Record 6" },
							],
						},
					},
				]

				const testCases = generateFilterTestCases(testRecords, baseTestCases)

				it.each(testCases)(
					"$title",
					async ({ operator, value, is_not, expected }) => {
						// Arrange
						await createManyTestSamples(testExecutionUser.id, testRecords)

						// Act
						const response = await requestGet("sample", {
							fields: "name",
							filter: {
								and: [{ field: targetField, operator, value, is_not }],
							},
							order_by: [{ field: "name" }],
						})

						// Assert
						const { data } = await response.json()
						expect(data).toStrictEqual(expected.data)
					},
				)
			})

			describe("numeric型", async () => {
				const targetField = "integer"
				const testRecords = [
					{ name: "Record 1", integer: -2 },
					{ name: "Record 2", integer: -1 },
					{ name: "Record 3", integer: 0 },
					{ name: "Record 4", integer: 1 },
					{ name: "Record 5", integer: 2 },
					{ name: "Record 6", integer: null },
				]

				const baseTestCases = [
					{
						title: "eq",
						operator: "eq",
						value: 0,
						expected: { data: [{ name: "Record 3" }] },
					},
					{
						title: "gt",
						operator: "gt",
						value: 0,
						expected: { data: [{ name: "Record 4" }, { name: "Record 5" }] },
					},
					{
						title: "gte",
						operator: "gte",
						value: 0,
						expected: {
							data: [
								{ name: "Record 3" },
								{ name: "Record 4" },
								{ name: "Record 5" },
							],
						},
					},
					{
						title: "lt",
						operator: "lt",
						value: 0,
						expected: { data: [{ name: "Record 1" }, { name: "Record 2" }] },
					},
					{
						title: "lte",
						operator: "lte",
						value: 0,
						expected: {
							data: [
								{ name: "Record 1" },
								{ name: "Record 2" },
								{ name: "Record 3" },
							],
						},
					},
					{
						title: "is_set",
						operator: "is_set",
						expected: {
							data: [
								{ name: "Record 1" },
								{ name: "Record 2" },
								{ name: "Record 4" },
								{ name: "Record 5" },
							],
						},
					},
				]

				const testCases = generateFilterTestCases(testRecords, baseTestCases)

				it.each(testCases)(
					"$title",
					async ({ operator, value, is_not, expected }) => {
						// Arrange
						await createManyTestSamples(testExecutionUser.id, testRecords)

						// Act
						const response = await requestGet("sample", {
							fields: "name",
							filter: {
								and: [{ field: targetField, operator, value, is_not }],
							},
							order_by: [{ field: "name" }],
						})

						// Assert
						const { data } = await response.json()
						expect(data).toStrictEqual(expected.data)
					},
				)
			})

			describe("boolean型", async () => {
				const targetField = "boolean"
				const testRecords = [
					{ name: "Record 1", boolean: true },
					{ name: "Record 2", boolean: false },
					{ name: "Record 3", boolean: null },
				]

				const baseTestCases = [
					{
						title: "eq (true)",
						operator: "eq",
						value: true,
						expected: { data: [{ name: "Record 1" }] },
					},
					{
						title: "eq (false)",
						operator: "eq",
						value: false,
						expected: { data: [{ name: "Record 2" }] },
					},
					{
						title: "is_set",
						operator: "is_set",
						expected: { data: [{ name: "Record 1" }] },
					},
				]

				const testCases = generateFilterTestCases(testRecords, baseTestCases)

				it.each(testCases)(
					"$title",
					async ({ operator, value, is_not, expected }) => {
						// Arrange
						await createManyTestSamples(testExecutionUser.id, testRecords)

						// Act
						const response = await requestGet("sample", {
							fields: "name",
							filter: {
								and: [{ field: targetField, operator, value, is_not }],
							},
							order_by: [{ field: "name" }],
						})

						// Assert
						const { data } = await response.json()
						expect(data).toStrictEqual(expected.data)
					},
				)
			})

			describe("date型（date）", async () => {
				const targetField = "date"
				const testRecords = [
					{ name: "Record 1", date: new Date("2025-01-01") },
					{ name: "Record 2", date: new Date("2025-01-02") },
					{ name: "Record 3", date: new Date("2025-01-03") },
					{ name: "Record 4", date: new Date("2025-01-04") },
					{ name: "Record 5", date: new Date("2025-01-05") },
					{ name: "Record 6", date: null },
				]

				const baseTestCases = [
					{
						title: "eq",
						operator: "eq",
						value: "2025-01-03",
						expected: { data: [{ name: "Record 3" }] },
					},
					{
						title: "gt",
						operator: "gt",
						value: "2025-01-03",
						expected: { data: [{ name: "Record 4" }, { name: "Record 5" }] },
					},
					{
						title: "gte",
						operator: "gte",
						value: "2025-01-03",
						expected: {
							data: [
								{ name: "Record 3" },
								{ name: "Record 4" },
								{ name: "Record 5" },
							],
						},
					},
					{
						title: "lt",
						operator: "lt",
						value: "2025-01-03",
						expected: { data: [{ name: "Record 1" }, { name: "Record 2" }] },
					},
					{
						title: "lte",
						operator: "lte",
						value: "2025-01-03",
						expected: {
							data: [
								{ name: "Record 1" },
								{ name: "Record 2" },
								{ name: "Record 3" },
							],
						},
					},
					{
						title: "is_set",
						operator: "is_set",
						expected: {
							data: [
								{ name: "Record 1" },
								{ name: "Record 2" },
								{ name: "Record 3" },
								{ name: "Record 4" },
								{ name: "Record 5" },
							],
						},
					},
				]

				const testCases = generateFilterTestCases(testRecords, baseTestCases)

				it.each(testCases)(
					"$title",
					async ({ operator, value, is_not, expected }) => {
						// Arrange
						await createManyTestSamples(testExecutionUser.id, testRecords)

						// Act
						const response = await requestGet("sample", {
							fields: "name",
							filter: {
								and: [{ field: targetField, operator, value, is_not }],
							},
							order_by: [{ field: "name" }],
						})

						// Assert
						const { data } = await response.json()
						expect(data).toStrictEqual(expected.data)
					},
				)
			})

			describe("date型（time）", async () => {
				const targetField = "time"
				const testRecords = [
					{ name: "Record 1", time: "01:11:11" },
					{ name: "Record 2", time: "02:22:22" },
					{ name: "Record 3", time: "03:33:33" },
					{ name: "Record 4", time: "04:44:44" },
					{ name: "Record 5", time: "05:55:55" },
					{ name: "Record 6", time: null },
				]

				const baseTestCases = [
					{
						title: "eq",
						operator: "eq",
						value: "03:33:33",
						expected: { data: [{ name: "Record 3" }] },
					},
					{
						title: "gt",
						operator: "gt",
						value: "03:33:33",
						expected: { data: [{ name: "Record 4" }, { name: "Record 5" }] },
					},
					{
						title: "gte",
						operator: "gte",
						value: "03:33:33",
						expected: {
							data: [
								{ name: "Record 3" },
								{ name: "Record 4" },
								{ name: "Record 5" },
							],
						},
					},
					{
						title: "lt",
						operator: "lt",
						value: "03:33:33",
						expected: { data: [{ name: "Record 1" }, { name: "Record 2" }] },
					},
					{
						title: "lte",
						operator: "lte",
						value: "03:33:33",
						expected: {
							data: [
								{ name: "Record 1" },
								{ name: "Record 2" },
								{ name: "Record 3" },
							],
						},
					},
					{
						title: "is_set",
						operator: "is_set",
						expected: {
							data: [
								{ name: "Record 1" },
								{ name: "Record 2" },
								{ name: "Record 3" },
								{ name: "Record 4" },
								{ name: "Record 5" },
							],
						},
					},
				]

				const testCases = generateFilterTestCases(testRecords, baseTestCases)

				it.each(testCases)(
					"$title",
					async ({ operator, value, is_not, expected }) => {
						// Arrange
						await createManyTestSamples(testExecutionUser.id, testRecords)

						// Act
						const response = await requestGet("sample", {
							fields: "name",
							filter: {
								and: [{ field: targetField, operator, value, is_not }],
							},
							order_by: [{ field: "name" }],
						})

						// Assert
						const { data } = await response.json()
						expect(data).toStrictEqual(expected.data)
					},
				)
			})

			describe("date型（datetime）", async () => {
				const targetField = "datetime"
				const testRecords = [
					{ name: "Record 1", datetime: "2025-01-01T01:11:11Z" },
					{ name: "Record 2", datetime: "2025-01-01T02:22:22Z" },
					{ name: "Record 3", datetime: "2025-01-01T03:33:33Z" },
					{ name: "Record 4", datetime: "2025-01-01T04:44:44Z" },
					{ name: "Record 5", datetime: "2025-01-01T05:55:55Z" },
					{ name: "Record 6", datetime: null },
				]

				const baseTestCases = [
					{
						title: "eq",
						operator: "eq",
						value: "2025-01-01T03:33:33Z",
						expected: { data: [{ name: "Record 3" }] },
					},
					{
						title: "gt",
						operator: "gt",
						value: "2025-01-01T03:33:33Z",
						expected: { data: [{ name: "Record 4" }, { name: "Record 5" }] },
					},
					{
						title: "gte",
						operator: "gte",
						value: "2025-01-01T03:33:33Z",
						expected: {
							data: [
								{ name: "Record 3" },
								{ name: "Record 4" },
								{ name: "Record 5" },
							],
						},
					},
					{
						title: "lt",
						operator: "lt",
						value: "2025-01-01T03:33:33Z",
						expected: { data: [{ name: "Record 1" }, { name: "Record 2" }] },
					},
					{
						title: "lte",
						operator: "lte",
						value: "2025-01-01T03:33:33Z",
						expected: {
							data: [
								{ name: "Record 1" },
								{ name: "Record 2" },
								{ name: "Record 3" },
							],
						},
					},
					{
						title: "is_set",
						operator: "is_set",
						expected: {
							data: [
								{ name: "Record 1" },
								{ name: "Record 2" },
								{ name: "Record 3" },
								{ name: "Record 4" },
								{ name: "Record 5" },
							],
						},
					},
				]

				const testCases = generateFilterTestCases(testRecords, baseTestCases)

				it.each(testCases)(
					"$title",
					async ({ operator, value, is_not, expected }) => {
						// Arrange
						await createManyTestSamples(testExecutionUser.id, testRecords)

						// Act
						const response = await requestGet("sample", {
							fields: "name",
							filter: {
								and: [{ field: targetField, operator, value, is_not }],
							},
							order_by: [{ field: "name" }],
						})

						// Assert
						const { data } = await response.json()
						expect(data).toStrictEqual(expected.data)
					},
				)
			})

			describe("option型（single）", async () => {
				const targetField = "option_single"
				const testRecords = [
					{ name: "Record 1", option_single: "option1" },
					{ name: "Record 2", option_single: "option2" },
					{ name: "Record 3", option_single: "option3" },
					{ name: "Record 4", option_single: null },
				]

				const baseTestCases = [
					{
						title: "eq",
						operator: "eq",
						value: "option2",
						expected: { data: [{ name: "Record 2" }] },
					},
					{
						title: "is_set",
						operator: "is_set",
						expected: {
							data: [
								{ name: "Record 1" },
								{ name: "Record 2" },
								{ name: "Record 3" },
							],
						},
					},
				]

				const testCases = generateFilterTestCases(testRecords, baseTestCases)

				it.each(testCases)(
					"$title",
					async ({ operator, value, is_not, expected }) => {
						// Arrange
						await createManyTestSamples(testExecutionUser.id, testRecords)

						// Act
						const response = await requestGet("sample", {
							fields: "name",
							filter: {
								and: [{ field: targetField, operator, value, is_not }],
							},
							order_by: [{ field: "name" }],
						})

						// Assert
						const { data } = await response.json()
						expect(data).toStrictEqual(expected.data)
					},
				)
			})

			describe("option型（multi）", async () => {
				const targetField = "option_multi"
				const testRecords = [
					{ name: "Record 1", option_multi: ["option1"] },
					{ name: "Record 2", option_multi: ["option1", "option2"] },
					{ name: "Record 3", option_multi: ["option2", "option3", "option4"] },
					{ name: "Record 4", option_multi: [] },
					{ name: "Record 5", option_multi: null },
				]

				const baseTestCases = [
					{
						title: "eq",
						operator: "eq",
						value: "option1",
						expected: { data: [{ name: "Record 1" }] },
					},
					{
						title: "includes",
						operator: "includes",
						value: "option2",
						expected: { data: [{ name: "Record 2" }, { name: "Record 3" }] },
					},
					{
						title: "is_set",
						operator: "is_set",
						expected: {
							data: [
								{ name: "Record 1" },
								{ name: "Record 2" },
								{ name: "Record 3" },
							],
						},
					},
				]

				const testCases = generateFilterTestCases(testRecords, baseTestCases)

				it.each(testCases)(
					"$title",
					async ({ operator, value, is_not, expected }) => {
						// Arrange
						await createManyTestSamples(testExecutionUser.id, testRecords)

						// Act
						const response = await requestGet("sample", {
							fields: "name",
							filter: {
								and: [{ field: targetField, operator, value, is_not }],
							},
							order_by: [{ field: "name" }],
						})

						// Assert
						const { data } = await response.json()
						expect(data).toStrictEqual(expected.data)
					},
				)
			})

			describe("reference型（single）", async () => {
				const targetField = "reference_single_target_single_id"
				const recordId1 = crypto.randomUUID()
				const recordId2 = crypto.randomUUID()
				const recordId3 = crypto.randomUUID()
				const testRecords = [
					{
						name: "Record 1",
						reference_single_target_single_id: {
							entity_name: "account",
							id: recordId1,
						},
					},
					{
						name: "Record 2",
						reference_single_target_single_id: {
							entity_name: "account",
							id: recordId2,
						},
					},
					{
						name: "Record 3",
						reference_single_target_single_id: {
							entity_name: "account",
							id: recordId3,
						},
					},
					{ name: "Record 4", reference_single_target_single_id: null },
				]

				const baseTestCases = [
					{
						title: "eq",
						operator: "eq",
						value: { entity_name: "account", id: recordId2 },
						expected: { data: [{ name: "Record 2" }] },
					},
					{
						title: "is_set",
						operator: "is_set",
						expected: {
							data: [
								{ name: "Record 1" },
								{ name: "Record 2" },
								{ name: "Record 3" },
							],
						},
					},
				]

				const testCases = generateFilterTestCases(testRecords, baseTestCases)

				it.each(testCases)(
					"$title",
					async ({ operator, value, is_not, expected }) => {
						// Arrange
						await createManyTestSamples(testExecutionUser.id, testRecords)

						// Act
						const response = await requestGet("sample", {
							fields: "name",
							filter: {
								and: [{ field: targetField, operator, value, is_not }],
							},
							order_by: [{ field: "name" }],
						})

						// Assert
						const { data } = await response.json()
						expect(data).toStrictEqual(expected.data)
					},
				)
			})

			describe("reference型（multi）", async () => {
				const targetField = "reference_multi_target_multi_id"
				const recordId1 = crypto.randomUUID()
				const recordId2 = crypto.randomUUID()
				const testRecords = [
					{
						name: "Record 1",
						reference_multi_target_multi_id: [
							{ entity_name: "account", id: recordId1 },
						],
					},
					{
						name: "Record 2",
						reference_multi_target_multi_id: [
							{ entity_name: "lead", id: recordId1 },
						],
					},
					{
						name: "Record 3",
						reference_multi_target_multi_id: [
							{ entity_name: "account", id: recordId1 },
							{ entity_name: "lead", id: recordId1 },
						],
					},
					{
						name: "Record 4",
						reference_multi_target_multi_id: [
							{ entity_name: "account", id: recordId2 },
						],
					},
					{
						name: "Record 5",
						reference_multi_target_multi_id: [
							{ entity_name: "lead", id: recordId2 },
						],
					},
					{ name: "Record 6", reference_multi_target_multi_id: [] },
					{ name: "Record 7", reference_multi_target_multi_id: null },
				]

				const baseTestCases = [
					{
						title: "eq",
						operator: "eq",
						value: { entity_name: "account", id: recordId1 },
						expected: { data: [{ name: "Record 1" }] },
					},
					{
						title: "includes",
						operator: "includes",
						value: { entity_name: "lead", id: recordId1 },
						expected: { data: [{ name: "Record 2" }, { name: "Record 3" }] },
					},
					{
						title: "is_set",
						operator: "is_set",
						expected: {
							data: [
								{ name: "Record 1" },
								{ name: "Record 2" },
								{ name: "Record 3" },
								{ name: "Record 4" },
								{ name: "Record 5" },
							],
						},
					},
				]

				const testCases = generateFilterTestCases(testRecords, baseTestCases)

				it.each(testCases)(
					"$title",
					async ({ operator, value, is_not, expected }) => {
						// Arrange
						await createManyTestSamples(testExecutionUser.id, testRecords)

						// Act
						const response = await requestGet("sample", {
							fields: "name",
							filter: {
								and: [{ field: targetField, operator, value, is_not }],
							},
							order_by: [{ field: "name" }],
						})

						// Assert
						const { data } = await response.json()
						expect(data).toStrictEqual(expected.data)
					},
				)
			})
		})

		describe("複数条件検索が正常に動作すること", () => {
			it.each([
				{
					title: "AND検索",
					testRecords: [
						{ name: "Record 1", text: "text A", integer: 1 },
						{ name: "Record 2", text: "text A", integer: 2 },
						{ name: "Record 3", text: "text A", integer: 3 },
						{ name: "Record 4", text: "text B", integer: 4 },
						{ name: "Record 5", text: "text B", integer: 5 },
						{ name: "Record 6", text: "text B", integer: 6 },
						{ name: "Record 7", text: "text C", integer: 7 },
						{ name: "Record 8", text: "text C", integer: 8 },
						{ name: "Record 9", text: "text C", integer: 9 },
					],
					filter: {
						and: [
							{ field: "text", operator: "eq", value: "text B" },
							{ field: "integer", operator: "gte", value: 5 },
						],
					},
					expected: { data: [{ name: "Record 5" }, { name: "Record 6" }] },
				},
				{
					title: "OR検索",
					testRecords: [
						{ name: "Record 1", text: "text A", boolean: false },
						{ name: "Record 2", text: "text A", boolean: false },
						{ name: "Record 3", text: "text A", boolean: true },
						{ name: "Record 4", text: "text B", boolean: false },
						{ name: "Record 5", text: "text B", boolean: false },
						{ name: "Record 6", text: "text B", boolean: true },
						{ name: "Record 7", text: "text C", boolean: false },
						{ name: "Record 8", text: "text C", boolean: false },
						{ name: "Record 9", text: "text C", boolean: true },
					],
					filter: {
						or: [
							{ field: "text", operator: "eq", value: "text B" },
							{ field: "boolean", operator: "eq", value: true },
						],
					},
					expected: {
						data: [
							{ name: "Record 3" },
							{ name: "Record 4" },
							{ name: "Record 5" },
							{ name: "Record 6" },
							{ name: "Record 9" },
						],
					},
				},
				{
					title: "ネスト検索（AND -> OR）",
					testRecords: [
						{ name: "Record 1", text: "text A", integer: 1, boolean: false },
						{ name: "Record 2", text: "text A", integer: 2, boolean: false },
						{ name: "Record 3", text: "text A", integer: 3, boolean: true },
						{ name: "Record 4", text: "text B", integer: 4, boolean: false },
						{ name: "Record 5", text: "text B", integer: 5, boolean: false },
						{ name: "Record 6", text: "text B", integer: 6, boolean: true },
						{ name: "Record 7", text: "text C", integer: 7, boolean: false },
						{ name: "Record 8", text: "text C", integer: 8, boolean: false },
						{ name: "Record 9", text: "text C", integer: 9, boolean: true },
					],
					filter: {
						and: [
							{
								or: [
									{ field: "text", operator: "eq", value: "text B" },
									{ field: "integer", operator: "gte", value: 5 },
								],
							},
							{ field: "boolean", operator: "eq", value: true },
						],
					},
					expected: { data: [{ name: "Record 6" }, { name: "Record 9" }] },
				},
				{
					title: "ネスト検索（OR -> AND）",
					testRecords: [
						{ name: "Record 1", text: "text A", integer: 1, boolean: false },
						{ name: "Record 2", text: "text A", integer: 2, boolean: false },
						{ name: "Record 3", text: "text A", integer: 3, boolean: true },
						{ name: "Record 4", text: "text B", integer: 4, boolean: false },
						{ name: "Record 5", text: "text B", integer: 5, boolean: false },
						{ name: "Record 6", text: "text B", integer: 6, boolean: true },
						{ name: "Record 7", text: "text C", integer: 7, boolean: false },
						{ name: "Record 8", text: "text C", integer: 8, boolean: false },
						{ name: "Record 9", text: "text C", integer: 9, boolean: true },
					],
					filter: {
						or: [
							{
								and: [
									{ field: "text", operator: "eq", value: "text B" },
									{ field: "integer", operator: "gte", value: 5 },
								],
							},
							{ field: "boolean", operator: "eq", value: true },
						],
					},
					expected: {
						data: [
							{ name: "Record 3" },
							{ name: "Record 5" },
							{ name: "Record 6" },
							{ name: "Record 9" },
						],
					},
				},
			])("$title", async ({ testRecords, filter, expected }) => {
				// Arrange
				await createManyTestSamples(testExecutionUser.id, testRecords)

				// Act
				const response = await requestGet("sample", {
					fields: "name",
					filter,
					order_by: [{ field: "name" }],
				})

				// Assert
				const { data } = await response.json()
				expect(data).toStrictEqual(expected.data)
			})
		})
	})

	describe("group_byパラメータ", () => {
		describe("指定した項目でグループ化されること", () => {
			const testRecords = [
				{ name: "Record 1", text: "text A", option_single: "option A" },
				{ name: "Record 2", text: "text A", option_single: "option A" },
				{ name: "Record 3", text: "text A", option_single: "option B" },
				{ name: "Record 4", text: "text B", option_single: "option A" },
				{ name: "Record 5", text: "text B", option_single: "option A" },
				{ name: "Record 6", text: "text B", option_single: "option B" },
				{ name: "Record 7", text: "text C", option_single: "option A" },
				{ name: "Record 8", text: "text C", option_single: "option A" },
				{ name: "Record 9", text: "text C", option_single: "option B" },
			]

			it.each([
				{
					title: "単一条件",
					fields: "text",
					group_by: "text",
					order_by: [{ field: "text" }],
					expected: {
						data: [{ text: "text A" }, { text: "text B" }, { text: "text C" }],
					},
				},
				{
					title: "複数条件",
					fields: "text,option_single",
					group_by: "text,option_single",
					order_by: [{ field: "text" }, { field: "option_single" }],
					expected: {
						data: [
							{ text: "text A", option_single: "option A" },
							{ text: "text A", option_single: "option B" },
							{ text: "text B", option_single: "option A" },
							{ text: "text B", option_single: "option B" },
							{ text: "text C", option_single: "option A" },
							{ text: "text C", option_single: "option B" },
						],
					},
				},
			])("$title", async ({ fields, group_by, order_by, expected }) => {
				// Arrange
				await createManyTestSamples(testExecutionUser.id, testRecords)

				// Act
				const response = await requestGet("sample", {
					fields,
					group_by,
					order_by,
				})

				// Assert
				const { data } = await response.json()
				expect(data).toStrictEqual(expected.data)
			})
		})
	})

	describe("order_byパラメータ", () => {
		describe("指定した項目で並び替えられること", () => {
			const testRecords = [
				{ name: "Record 1", text: "text A", option_single: "option A" },
				{ name: "Record 2", text: "text B", option_single: "option A" },
				{ name: "Record 3", text: "text C", option_single: "option B" },
				{ name: "Record 4", text: "text D", option_single: "option A" },
				{ name: "Record 5", text: "text E", option_single: "option A" },
				{ name: "Record 6", text: "text F", option_single: "option B" },
				{ name: "Record 7", text: "text G", option_single: "option A" },
				{ name: "Record 8", text: "text H", option_single: "option A" },
				{ name: "Record 9", text: "text I", option_single: "option B" },
			]

			it.each([
				{
					title: "単一条件",
					order_by: [{ field: "text", direction: "desc" }],
					expected: {
						data: [
							{ name: "Record 9" },
							{ name: "Record 8" },
							{ name: "Record 7" },
							{ name: "Record 6" },
							{ name: "Record 5" },
							{ name: "Record 4" },
							{ name: "Record 3" },
							{ name: "Record 2" },
							{ name: "Record 1" },
						],
					},
				},
				{
					title: "複数条件",
					order_by: [
						{ field: "option_single", direction: "asc" },
						{ field: "text", direction: "desc" },
					],
					expected: {
						data: [
							{ name: "Record 8" },
							{ name: "Record 7" },
							{ name: "Record 5" },
							{ name: "Record 4" },
							{ name: "Record 2" },
							{ name: "Record 1" },
							{ name: "Record 9" },
							{ name: "Record 6" },
							{ name: "Record 3" },
						],
					},
				},
			])("$title", async ({ order_by, expected }) => {
				// Arrange
				await createManyTestSamples(testExecutionUser.id, testRecords)

				// Act
				const response = await requestGet("sample", {
					fields: "name",
					order_by,
				})

				// Assert
				const { data } = await response.json()
				expect(data).toStrictEqual(expected.data)
			})
		})
	})

	describe("limitパラメータ", () => {
		describe("指定した数を上限に対象レコードを返すこと", () => {
			const testRecords = [
				{ name: "Record 1" },
				{ name: "Record 2" },
				{ name: "Record 3" },
				{ name: "Record 4" },
				{ name: "Record 5" },
			]

			it.each([
				{
					title: "limit < 対象レコード数",
					limit: 2,
					expected: {
						has_next_page: true,
						total_size: 5,
						data: [{ name: "Record 1" }, { name: "Record 2" }],
					},
				},
				{
					title: "limit = 対象レコード数",
					limit: 5,
					expected: {
						has_next_page: false,
						total_size: 5,
						data: [
							{ name: "Record 1" },
							{ name: "Record 2" },
							{ name: "Record 3" },
							{ name: "Record 4" },
							{ name: "Record 5" },
						],
					},
				},
				{
					title: "limit > 対象レコード数",
					limit: 6,
					expected: {
						has_next_page: false,
						total_size: 5,
						data: [
							{ name: "Record 1" },
							{ name: "Record 2" },
							{ name: "Record 3" },
							{ name: "Record 4" },
							{ name: "Record 5" },
						],
					},
				},
			])("$title", async ({ limit, expected }) => {
				// Arrange
				await createManyTestSamples(testExecutionUser.id, testRecords)

				// Act
				const response = await requestGet("sample", {
					fields: "name",
					order_by: [{ field: "name" }],
					limit,
				})

				// Assert
				const json = await response.json()
				expect(json).toStrictEqual(expected)
			})
		})
	})

	describe("limitパラメータ + offsetパラメータ", () => {
		describe("指定した範囲の対象レコードを返すこと", () => {
			const testRecords = [
				{ name: "Record 1" },
				{ name: "Record 2" },
				{ name: "Record 3" },
				{ name: "Record 4" },
				{ name: "Record 5" },
			]

			it.each([
				{
					title: "(limit + offset) < 対象レコード数",
					limit: 2,
					offset: 1,
					expected: {
						has_next_page: true,
						total_size: 5,
						data: [{ name: "Record 2" }, { name: "Record 3" }],
					},
				},
				{
					title: "(limit + offset) = 対象レコード数",
					limit: 3,
					offset: 2,
					expected: {
						has_next_page: false,
						total_size: 5,
						data: [
							{ name: "Record 3" },
							{ name: "Record 4" },
							{ name: "Record 5" },
						],
					},
				},
				{
					title: "(limit + offset) > 対象レコード数",
					limit: 3,
					offset: 3,
					expected: {
						has_next_page: false,
						total_size: 5,
						data: [{ name: "Record 4" }, { name: "Record 5" }],
					},
				},
				{
					title: "offset >= 対象レコード数",
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
				await createManyTestSamples(testExecutionUser.id, testRecords)

				// Act
				const response = await requestGet("sample", {
					fields: "name",
					order_by: [{ field: "name" }],
					limit,
					offset,
				})

				// Assert
				const json = await response.json()
				expect(json).toStrictEqual(expected)
			})
		})
	})

	describe("パラメータのバリデーションに失敗する場合に400エラーを返すこと", () => {
		it.each([
			// TODO: 実装側の修正が必要
			// {
			// 	title: "fieldsパラメータがない",
			// 	params: {},
			// },
			{
				title: "fieldsに指定されたフィールドがgroup_byに含まれていない",
				params: { fields: "name", group_by: "text" },
			},
		])("$title", async ({ params }) => {
			// Act
			const response = await requestGet("sample", params)

			// Assert
			const json = await response.json()
			expect(response.status).toBe(400)
			expect(json).toHaveProperty("message")
		})
	})

	it("存在しないエンティティを指定した場合に404エラーを返すこと", async () => {
		// Arrange
		await createTestSample(testExecutionUser.id, { name: "Sample to Get" })

		// Act
		const response = await requestGet("nonexistent_entity", { fields: "id" })

		// Assert
		const json = await response.json()
		expect(response.status).toBe(404)
		expect(json).toHaveProperty("message")
	})
})
