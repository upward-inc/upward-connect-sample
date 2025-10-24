import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { app } from "../../.."
import type { SystemUser } from "../../../schema/system-user"
import {
	type TestExecutionUser,
	createTestExecutionUser,
	deleteTestExecutionUser,
} from "../../../test/utils/execution-user"

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
				first_name: "System",
				last_name: "UserTest",
				email: "system_user_test@example.com",
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
	 * システムユーザーAPIへのGETリクエストを送信する
	 */
	async function requestGet(authToken = testExecutionUser.access_token) {
		return await app.request("/api/v1/system-users", {
			method: "GET",
			headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
		})
	}

	it("システムユーザー一覧を正常に取得できること", async () => {
		// Act
		const response = await requestGet()

		// Assert
		expect(response.status).toBe(200)
		const data = await response.json()
		expect(Array.isArray(data)).toBe(true)
		expect(data.length).toBeGreaterThan(0)
	})

	it("レスポンスに作成したテストユーザーが含まれること", async () => {
		// Act
		const response = await requestGet()

		// Assert
		const data = await response.json()
		const testUserInResponse = data.find(
			(user: SystemUser) => user.id === testExecutionUser.id,
		)
		expect(testUserInResponse).toBeTruthy()
		expect(testUserInResponse.id).toBe(testExecutionUser.id)
		expect(testUserInResponse.user_name).toBe(testExecutionUser.user_name)
		expect(testUserInResponse.first_name).toBe("System")
		expect(testUserInResponse.last_name).toBe("UserTest")
		expect(testUserInResponse.email).toBe("system_user_test@example.com")
	})

	it("レスポンスに必要なプロパティが含まれること", async () => {
		// Act
		const response = await requestGet()

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
