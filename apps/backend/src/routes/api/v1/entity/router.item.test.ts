import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { app } from "../../../.."
import {
	cleanupEntityMetadata,
	setupEntityMetadata,
} from "../../../../test/utils/entity"
import {
	type TestExecutionUser,
	createTestExecutionUser,
	deleteTestExecutionUser,
} from "../../../../test/utils/execution-user"

const textValidation = (value: object) => {
	expect(value).toStrictEqual({
		name: "text",
		display_name: "テキスト",
		type: "text",
		sub_type: null,
		is_required: false,
		is_filterable: true,
		is_creatable: true,
		is_updatable: true,
		is_formula: false,
		max_length: null,
		precision: null,
		scale: null,
		reference_entities: null,
		options: [],
		default_value: null,
	})
}

const numericValidation = (value: object) => {
	expect(value).toStrictEqual({
		name: "decimal",
		display_name: "少数あり",
		type: "numeric",
		sub_type: "decimal",
		is_required: false,
		is_filterable: true,
		is_creatable: true,
		is_updatable: true,
		is_formula: false,
		max_length: null,
		precision: 16,
		scale: 2,
		reference_entities: null,
		options: [],
		default_value: null,
	})
}

const booleanValidation = (value: object) => {
	expect(value).toStrictEqual({
		name: "boolean",
		display_name: "真偽値",
		type: "boolean",
		sub_type: null,
		is_required: false,
		is_filterable: true,
		is_creatable: true,
		is_updatable: true,
		is_formula: false,
		max_length: null,
		precision: null,
		scale: null,
		reference_entities: null,
		options: [],
		default_value: null,
	})
}

const optionSingleValidation = (value: object) => {
	expect(value).toStrictEqual({
		name: "option_single",
		display_name: "単一選択肢",
		type: "option",
		sub_type: "single",
		is_required: false,
		is_filterable: true,
		is_creatable: true,
		is_updatable: true,
		is_formula: false,
		max_length: null,
		precision: null,
		scale: null,
		reference_entities: null,
		options: [
			{
				name: "option1",
				display_name: "オプション1",
			},
			{
				name: "option2",
				display_name: "オプション2",
			},
			{
				name: "option3",
				display_name: "オプション3",
			},
			{
				name: "option4",
				display_name: "オプション4",
			},
			{
				name: "option5",
				display_name: "オプション5",
			},
		],
		default_value: "option1",
	})
}

const optionMultiValidation = (value: object) => {
	expect(value).toStrictEqual({
		name: "option_multi",
		display_name: "複数選択肢",
		type: "option",
		sub_type: "multi",
		is_required: false,
		is_filterable: true,
		is_creatable: true,
		is_updatable: true,
		is_formula: false,
		max_length: null,
		precision: null,
		scale: null,
		reference_entities: null,
		options: [
			{
				name: "option1",
				display_name: "オプション1",
			},
			{
				name: "option2",
				display_name: "オプション2",
			},
			{
				name: "option3",
				display_name: "オプション3",
			},
			{
				name: "option4",
				display_name: "オプション4",
			},
			{
				name: "option5",
				display_name: "オプション5",
			},
		],
		default_value: ["option2", "option4"],
	})
}

const comboboxValidation = (value: object) => {
	expect(value).toStrictEqual({
		name: "combobox",
		display_name: "コンボボックス",
		type: "text",
		sub_type: "combobox",
		is_required: false,
		is_filterable: true,
		is_creatable: true,
		is_updatable: true,
		is_formula: false,
		max_length: null,
		precision: null,
		scale: null,
		reference_entities: null,
		options: [
			{
				name: "option1",
				display_name: "オプション1",
			},
			{
				name: "option2",
				display_name: "オプション2",
			},
			{
				name: "option3",
				display_name: "オプション3",
			},
			{
				name: "option4",
				display_name: "オプション4",
			},
			{
				name: "option5",
				display_name: "オプション5",
			},
		],
		default_value: null,
	})
}

const referenceSingleValidation = (value: object) => {
	expect(value).toStrictEqual({
		name: "reference_single_target_single_id",
		display_name: "単一参照先、単一ID",
		type: "reference",
		sub_type: "single",
		is_required: false,
		is_filterable: true,
		is_creatable: true,
		is_updatable: true,
		is_formula: false,
		max_length: null,
		precision: null,
		scale: null,
		reference_entities: ["account"],
		options: [],
		default_value: null,
	})
}

describe("エンティティ項目の取得", () => {
	// テスト実施ユーザー
	let testExecutionUser: TestExecutionUser

	beforeAll(async ({ id: taskId }) => {
		const { user } = await setup(taskId)
		testExecutionUser = user
	})

	afterAll(async () => {
		await cleanup()
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
	 * エンティティ項目一覧APIへのGETリクエストを送信する
	 */
	async function requestGetEntityItemList(
		entityName: string,
		authToken = testExecutionUser.access_token,
	) {
		return await app.request(`/api/v1/entities/${entityName}/items`, {
			method: "GET",
			headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
		})
	}

	/**
	 * 単一エンティティ項目APIへのGETリクエストを送信する
	 */
	async function requestGetEntityItem(
		entityName: string,
		itemName: string,
		authToken = testExecutionUser.access_token,
	) {
		return await app.request(
			`/api/v1/entities/${entityName}/items/${itemName}`,
			{
				method: "GET",
				headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
			},
		)
	}

	/**
	 * 指定されたnameの項目をdata配列から検索して返す
	 */
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const findField = (data: any, name: string) => {
		return data.find((item: { name: string }) => item.name === name)
	}

	describe("GET /api/v1/entities/{entity_name}/items - エンティティ項目一覧の取得", () => {
		it("認証ヘッダーがない場合に401エラーを返すこと", async () => {
			// Act
			const response = await requestGetEntityItemList("sample", "")

			// Assert
			const json = await response.json()
			expect(response.status).toBe(401)
			expect(json).toHaveProperty("message")
		})

		it("リクエストが正常に処理された場合、200ステータスを返すこと", async () => {
			// Act
			const response = await requestGetEntityItemList("sample")

			// Assert
			expect(response.status).toBe(200)
		})

		it("リクエストが正常に処理された場合のレスポンスが正しいこと", async () => {
			// Act
			const response = await requestGetEntityItemList("sample")

			// Assert
			const data = await response.json()
			expect(Array.isArray(data)).toBe(true)
			// text型の項目検証
			textValidation(findField(data, "text"))
			// numeric型の項目検証
			numericValidation(findField(data, "decimal"))
			// boolean型の項目検証
			booleanValidation(findField(data, "boolean"))
			// option(single)型の項目検証
			optionSingleValidation(findField(data, "option_single"))
			// option(multi)型の項目検証
			optionMultiValidation(findField(data, "option_multi"))
			// combobox型の項目検証
			comboboxValidation(findField(data, "combobox"))
			// reference(single)型の項目検証
			referenceSingleValidation(
				findField(data, "reference_single_target_single_id"),
			)
		})
	})

	describe("GET /api/v1/entities/{entity_name}/items/{name} - 単一エンティティ項目の取得", () => {
		it("認証ヘッダーがない場合に401エラーを返すこと", async () => {
			// Act
			const response = await requestGetEntityItem("sample", "text", "")

			// Assert
			const json = await response.json()
			expect(response.status).toBe(401)
			expect(json).toHaveProperty("message")
		})

		it("リクエストが正常に処理された場合、200ステータスを返すこと", async () => {
			// Act
			const response = await requestGetEntityItem("sample", "text")

			// Assert
			expect(response.status).toBe(200)
		})

		it("text型の項目レスポンスが正しいこと", async () => {
			// Act
			const response = await requestGetEntityItem("sample", "text")

			// Assert
			const data = await response.json()
			textValidation(data)
		})

		it("numeric型の項目レスポンスが正しいこと", async () => {
			// Act
			const response = await requestGetEntityItem("sample", "decimal")

			// Assert
			const data = await response.json()
			numericValidation(data)
		})

		it("boolean型の項目レスポンスが正しいこと", async () => {
			// Act
			const response = await requestGetEntityItem("sample", "boolean")

			// Assert
			const data = await response.json()
			booleanValidation(data)
		})

		it("option(single)型の項目レスポンスが正しいこと", async () => {
			// Act
			const response = await requestGetEntityItem("sample", "option_single")

			// Assert
			const data = await response.json()
			optionSingleValidation(data)
		})

		it("option(multi)型の項目レスポンスが正しいこと", async () => {
			// Act
			const response = await requestGetEntityItem("sample", "option_multi")

			// Assert
			const data = await response.json()
			optionMultiValidation(data)
		})

		it("combobox型の項目レスポンスが正しいこと", async () => {
			// Act
			const response = await requestGetEntityItem("sample", "combobox")

			// Assert
			const data = await response.json()
			comboboxValidation(data)
		})

		it("reference(single)型の項目レスポンスが正しいこと", async () => {
			// Act
			const response = await requestGetEntityItem(
				"sample",
				"reference_single_target_single_id",
			)

			// Assert
			const data = await response.json()
			referenceSingleValidation(data)
		})
	})
})
