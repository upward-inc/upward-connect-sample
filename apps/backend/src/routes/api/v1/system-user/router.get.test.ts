import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { app } from "../../../../index"
import type { SystemUser } from "../../../../schema/system-user"
import {
	type TestExecutionUser,
	createTestExecutionUser,
	deleteTestExecutionUser,
} from "../../../../test/utils/execution-user"

describe("GET /api/v1/system-users - システムユーザー一覧取得", () => {
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
		const user = await createTestExecutionUser(
			{
				user_name: taskId,
			},
			{ withProfile: true },
		)

		return { user }
	}

	// テストデータのクリーンアップ
	async function cleanup() {
		await deleteTestExecutionUser(testExecutionUser.id)
	}

	/**
	 * システムユーザー一覧APIへのGETリクエストを送信する
	 */
	async function requestGetList(authToken = testExecutionUser.access_token) {
		return await app.request("/api/v1/system-users", {
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

	describe("GET /api/v1/system-users - 一覧取得", () => {
		it("システムユーザー一覧を正常に取得できること", async () => {
			// Act
			const response = await requestGetList()

			// Assert
			expect(response.status).toBe(200)
			const data = await response.json()
			expect(Array.isArray(data)).toBe(true)
			expect(data.length).toBeGreaterThan(0)
		})

		it("レスポンスに作成したテストユーザーが含まれること", async () => {
			// Act
			const response = await requestGetList()

			// Assert
			const data = await response.json()
			const testUserInResponse = data.find(
				(user: SystemUser) => user.id === testExecutionUser.id,
			)
			expect(testUserInResponse).toBeTruthy()
			expect(testUserInResponse.id).toBe(testExecutionUser.id)
			expect(testUserInResponse.user_name).toBe(testExecutionUser.user_name)
			expect(testUserInResponse.first_name).toBe(testExecutionUser.first_name)
			expect(testUserInResponse.last_name).toBe(testExecutionUser.last_name)
		})

		it("レスポンスに必要なプロパティが含まれること", async () => {
			// Act
			const response = await requestGetList()

			// Assert
			const data = await response.json()
			const testUserInResponse = data.find(
				(user: SystemUser) => user.id === testExecutionUser.id,
			)
			expect(testUserInResponse).toHaveProperty("profile_name")
			expect(testUserInResponse).toHaveProperty("timezone")
			expect(testUserInResponse).toHaveProperty("locale")
			expect(testUserInResponse).toHaveProperty("role_name")
			expect(testUserInResponse).toHaveProperty("is_active")
			expect(testUserInResponse).toHaveProperty("created_at")
			expect(testUserInResponse).toHaveProperty("modified_at")
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

		it("存在しないユーザーIDの場合に404エラーを返すこと", async () => {
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
