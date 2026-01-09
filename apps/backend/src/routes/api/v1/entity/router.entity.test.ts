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

describe("エンティティの取得", () => {
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
	 * エンティティ一覧APIへのGETリクエストを送信する
	 */
	async function requestGetEntityList(
		authToken = testExecutionUser.access_token,
	) {
		return await app.request("/api/v1/entities", {
			method: "GET",
			headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
		})
	}

	/**
	 * 単一エンティティAPIへのGETリクエストを送信する
	 */
	async function requestGetEntity(
		entityName: string,
		authToken = testExecutionUser.access_token,
	) {
		return await app.request(`/api/v1/entities/${entityName}`, {
			method: "GET",
			headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
		})
	}
	describe("GET /api/v1/entities - エンティティ一覧の取得", () => {
		it("認証ヘッダーがない場合に401エラーを返すこと", async () => {
			// Act
			const response = await requestGetEntityList("")

			// Assert
			expect(response.status).toBe(401)
		})

		it("リクエストが正常に処理された場合、200ステータスを返すこと", async () => {
			// Act
			const response = await requestGetEntityList()

			// Assert
			expect(response.status).toBe(200)
		})

		it("リクエストが正常に処理された場合のレスポンスが正しいこと", async () => {
			// Act
			const response = await requestGetEntityList()

			// Assert
			const data = await response.json()
			expect(data).toStrictEqual([
				{
					name: "user",
					display_name: "ユーザー",
					id_field_name: "id",
					title_field_name: "full_name",
				},
				{
					name: "account",
					display_name: "取引先",
					id_field_name: "id",
					title_field_name: "name",
				},
				{
					name: "lead",
					display_name: "リード",
					id_field_name: "id",
					title_field_name: "full_name",
				},
				{
					name: "activity",
					display_name: "活動",
					id_field_name: "id",
					title_field_name: "subject",
				},
				{
					name: "phone_call",
					display_name: "通話",
					id_field_name: "id",
					title_field_name: "subject",
				},
				{
					name: "contact",
					display_name: "取引先責任者",
					id_field_name: "id",
					title_field_name: "full_name",
				},
				{
					name: "opportunity",
					display_name: "商談",
					id_field_name: "id",
					title_field_name: "name",
				},
				{
					name: "case",
					display_name: "ケース",
					id_field_name: "id",
					title_field_name: "subject",
				},
				{
					name: "product",
					display_name: "製品",
					id_field_name: "id",
					title_field_name: "name",
				},
				{
					name: "campaign",
					display_name: "キャンペーン",
					id_field_name: "id",
					title_field_name: "name",
				},
				{
					name: "sample",
					display_name: "サンプル",
					id_field_name: "id",
					title_field_name: "name",
				},
			])
		})
	})

	describe("GET /api/v1/entities/{entity_name} - 単一エンティティの取得", () => {
		it("認証ヘッダーがない場合に401エラーを返すこと", async () => {
			// Act
			const response = await requestGetEntity("sample", "")

			// Assert
			expect(response.status).toBe(401)
		})

		it("リクエストが正常に処理された場合、200ステータスを返すこと", async () => {
			// Act
			const response = await requestGetEntity("sample")

			// Assert
			expect(response.status).toBe(200)
		})

		it("リクエストが正常に処理された場合のレスポンスが正しいこと", async () => {
			// Act
			const response = await requestGetEntity("sample")

			// Assert
			const data = await response.json()
			expect(data).toStrictEqual({
				name: "sample",
				display_name: "サンプル",
				id_field_name: "id",
				title_field_name: "name",
			})
		})
	})
})
