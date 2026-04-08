import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { app } from "../../../.."
import {
	cleanupEntityMetadata,
	setupEntityMetadata,
} from "../../../../test/utils/entity"
import {
	createTestExecutionUser,
	deleteTestExecutionUser,
	type TestExecutionUser,
} from "../../../../test/utils/execution-user"

describe("エンティティの取得", () => {
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
					type: "user",
					display_name: "ユーザー",
					record_url_format: {
						app: "http://url-test.app.localhost/records/user/{id}",
						browser: "http://url-test.browser.localhost/records/user/{id}",
					},
					has_location: false,
					item_mapping: {
						id: "id",
						title: "full_name",
						owner: null,
						created_at: "created_at",
						created_by: null,
						modified_at: "modified_at",
						modified_by: null,
						latitude: null,
						longitude: null,
					},
				},
				{
					name: "account",
					type: "account",
					display_name: "取引先",
					record_url_format: {
						app: "http://url-test.app.localhost/records/account/{id}",
						browser: "http://url-test.browser.localhost/records/account/{id}",
					},
					has_location: true,
					item_mapping: {
						id: "id",
						title: "name",
						owner: "owner",
						created_at: "created_at",
						created_by: "created_by",
						modified_at: "modified_at",
						modified_by: "modified_by",
						latitude: "latitude",
						longitude: "longitude",
					},
				},
				{
					name: "lead",
					type: "lead",
					display_name: "リード",
					record_url_format: {
						app: "http://url-test.app.localhost/records/lead/{id}",
						browser: "http://url-test.browser.localhost/records/lead/{id}",
					},
					has_location: true,
					item_mapping: {
						id: "id",
						title: "full_name",
						owner: "owner",
						created_at: "created_at",
						created_by: "created_by",
						modified_at: "modified_at",
						modified_by: "modified_by",
						latitude: "latitude",
						longitude: "longitude",
					},
				},
				{
					name: "activity",
					type: "activity",
					display_name: "活動",
					record_url_format: {
						app: "http://url-test.app.localhost/records/activity/{id}",
						browser: "http://url-test.browser.localhost/records/activity/{id}",
					},
					has_location: false,
					item_mapping: {
						id: "id",
						title: "subject",
						owner: "owner",
						created_at: "created_at",
						created_by: "created_by",
						modified_at: "modified_at",
						modified_by: "modified_by",
						latitude: null,
						longitude: null,
					},
				},
				{
					name: "phone_call",
					type: "phone_call",
					display_name: "通話",
					record_url_format: {
						app: "http://url-test.app.localhost/records/phone_call/{id}",
						browser:
							"http://url-test.browser.localhost/records/phone_call/{id}",
					},
					has_location: false,
					item_mapping: {
						id: "id",
						title: "subject",
						owner: "owner",
						created_at: "created_at",
						created_by: "created_by",
						modified_at: "modified_at",
						modified_by: "modified_by",
						latitude: null,
						longitude: null,
					},
				},
				{
					name: "contact",
					type: "contact",
					display_name: "取引先責任者",
					record_url_format: {
						app: "http://url-test.app.localhost/records/contact/{id}",
						browser: "http://url-test.browser.localhost/records/contact/{id}",
					},
					has_location: false,
					item_mapping: {
						id: "id",
						title: "full_name",
						owner: "owner",
						created_at: "created_at",
						created_by: "created_by",
						modified_at: "modified_at",
						modified_by: "modified_by",
						latitude: null,
						longitude: null,
					},
				},
				{
					name: "opportunity",
					type: null,
					display_name: "商談",
					record_url_format: {
						app: "http://url-test.app.localhost/records/opportunity/{id}",
						browser:
							"http://url-test.browser.localhost/records/opportunity/{id}",
					},
					has_location: false,
					item_mapping: {
						id: "id",
						title: "name",
						owner: "owner",
						created_at: "created_at",
						created_by: "created_by",
						modified_at: "modified_at",
						modified_by: "modified_by",
						latitude: null,
						longitude: null,
					},
				},
				{
					name: "case",
					type: null,
					display_name: "ケース",
					record_url_format: {
						app: "http://url-test.app.localhost/records/case/{id}",
						browser: "http://url-test.browser.localhost/records/case/{id}",
					},
					has_location: false,
					item_mapping: {
						id: "id",
						title: "subject",
						owner: "owner",
						created_at: "created_at",
						created_by: "created_by",
						modified_at: "modified_at",
						modified_by: "modified_by",
						latitude: null,
						longitude: null,
					},
				},
				{
					name: "product",
					type: null,
					display_name: "製品",
					record_url_format: {
						app: "http://url-test.app.localhost/records/product/{id}",
						browser: "http://url-test.browser.localhost/records/product/{id}",
					},
					has_location: false,
					item_mapping: {
						id: "id",
						title: "name",
						owner: "owner",
						created_at: "created_at",
						created_by: "created_by",
						modified_at: "modified_at",
						modified_by: "modified_by",
						latitude: null,
						longitude: null,
					},
				},
				{
					name: "campaign",
					type: null,
					display_name: "キャンペーン",
					record_url_format: {
						app: "http://url-test.app.localhost/records/campaign/{id}",
						browser: "http://url-test.browser.localhost/records/campaign/{id}",
					},
					has_location: false,
					item_mapping: {
						id: "id",
						title: "name",
						owner: "owner",
						created_at: "created_at",
						created_by: "created_by",
						modified_at: "modified_at",
						modified_by: "modified_by",
						latitude: null,
						longitude: null,
					},
				},
				{
					name: "sample",
					type: null,
					display_name: "サンプル",
					record_url_format: {
						app: "http://url-test.app.localhost/records/sample/{id}",
						browser: "http://url-test.browser.localhost/records/sample/{id}",
					},
					has_location: true,
					item_mapping: {
						id: "id",
						title: "name",
						owner: "owner",
						created_at: "created_at",
						created_by: "created_by",
						modified_at: "modified_at",
						modified_by: "modified_by",
						latitude: "latitude",
						longitude: "longitude",
					},
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
				type: null,
				display_name: "サンプル",
				record_url_format: {
					app: "http://url-test.app.localhost/records/sample/{id}",
					browser: "http://url-test.browser.localhost/records/sample/{id}",
				},
				has_location: true,
				item_mapping: {
					id: "id",
					title: "name",
					owner: "owner",
					created_at: "created_at",
					created_by: "created_by",
					modified_at: "modified_at",
					modified_by: "modified_by",
					latitude: "latitude",
					longitude: "longitude",
				},
			})
		})
	})
})
