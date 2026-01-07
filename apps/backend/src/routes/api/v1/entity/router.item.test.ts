import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
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
import { deleteAllTestSamples } from "../../../../test/utils/record"

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
				is_default: true,
			},
			{
				name: "option2",
				display_name: "オプション2",
				is_default: false,
			},
			{
				name: "option3",
				display_name: "オプション3",
				is_default: false,
			},
			{
				name: "option4",
				display_name: "オプション4",
				is_default: false,
			},
			{
				name: "option5",
				display_name: "オプション5",
				is_default: false,
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
				is_default: false,
			},
			{
				name: "option2",
				display_name: "オプション2",
				is_default: true,
			},
			{
				name: "option3",
				display_name: "オプション3",
				is_default: false,
			},
			{
				name: "option4",
				display_name: "オプション4",
				is_default: true,
			},
			{
				name: "option5",
				display_name: "オプション5",
				is_default: false,
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
				is_default: false,
			},
			{
				name: "option2",
				display_name: "オプション2",
				is_default: false,
			},
			{
				name: "option3",
				display_name: "オプション3",
				is_default: false,
			},
			{
				name: "option4",
				display_name: "オプション4",
				is_default: false,
			},
			{
				name: "option5",
				display_name: "オプション5",
				is_default: false,
			},
		],
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
			const text = data.find((item: { name: string }) => item.name === "text")
			textValidation(text)
			// option(single)型の項目検証
			const optionSingle = data.find(
				(item: { name: string }) => item.name === "option_single",
			)
			optionSingleValidation(optionSingle)
			// option(multi)型の項目検証
			const optionMulti = data.find(
				(item: { name: string }) => item.name === "option_multi",
			)
			optionMultiValidation(optionMulti)
			// combobox型の項目検証
			const combobox = data.find(
				(item: { name: string }) => item.name === "combobox",
			)
			comboboxValidation(combobox)
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

		it("リクエストが正常に処理された場合のレスポンスが正しいこと", async () => {
			// Act
			const response = await requestGetEntityItem("sample", "text")

			// Assert
			const data = await response.json()
			textValidation(data)
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
	})
})
