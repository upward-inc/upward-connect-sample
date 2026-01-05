import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest"
import { app } from "../.."
import {
	type TestExecutionUser,
	createTestExecutionUser,
	deleteTestExecutionUser,
} from "../../test/utils/execution-user"

const { mockGetActiveUserByUsernameAndPassword } = vi.hoisted(() => {
	return {
		mockGetActiveUserByUsernameAndPassword: vi.fn(),
	}
})

// Bun.passwordはvitestでサポートしないため、getActiveUserByUsernameAndPasswordをモックする
vi.mock("../../domain/auth/get-user", async () => {
	const originalModule = await vi.importActual("../../domain/auth/get-user")

	return {
		...originalModule,
		getActiveUserByUsernameAndPassword: mockGetActiveUserByUsernameAndPassword,
	}
})

describe("POST /auth/login - ログインエンドポイント", () => {
	// テスト実施ユーザー
	let testExecutionUser: TestExecutionUser

	beforeAll(async ({ id: taskId }) => {
		const { user } = await setup(taskId)
		testExecutionUser = user
	})

	afterAll(async () => {
		await cleanup()
	})

	beforeEach(() => {
		mockGetActiveUserByUsernameAndPassword.mockReturnValue(testExecutionUser)
	})

	afterEach(() => {
		mockGetActiveUserByUsernameAndPassword.mockReset()
	})

	// テストデータのセットアップ
	async function setup(taskId: string) {
		// テスト実施ユーザーの作成
		const user = await createTestExecutionUser({
			user_name: taskId,
			email: "internal_auth_test@example.com",
			timezone: "Asia/Tokyo",
			locale: "ja-JP",
		})

		return { user }
	}

	// テストデータのクリーンアップ
	async function cleanup() {
		await deleteTestExecutionUser(testExecutionUser.id)
	}

	/**
	 * /auth/loginへのPOSTリクエストを送信する
	 */
	async function requestLogin(params: Record<string, string>) {
		return await app.request("/auth/login", {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams(params),
		})
	}

	it("リクエストが正常に処理された場合、200ステータスを返すこと", async () => {
		// Act
		const response = await requestLogin({
			username: testExecutionUser.user_name,
			password: testExecutionUser.hashed_password,
		})

		// Assert
		expect(response.status).toBe(200)
	})

	it("リクエストが正常に処理された場合のレスポンス内容が正しいこと", async () => {
		// Act
		const response = await requestLogin({
			username: testExecutionUser.user_name,
			password: testExecutionUser.hashed_password,
		})

		// Assert
		const data = await response.json()

		expect(data).toHaveProperty("id", testExecutionUser.id)
		expect(data).toHaveProperty("user_name", testExecutionUser.user_name)
		expect(data).toHaveProperty("first_name", testExecutionUser.first_name)
		expect(data).toHaveProperty("last_name", testExecutionUser.last_name)
		expect(data).toHaveProperty("email", testExecutionUser.email)
		expect(data).toHaveProperty("timezone", testExecutionUser.timezone)
		expect(data).toHaveProperty("locale", testExecutionUser.locale)
		expect(typeof data.expired_at).toBe("string")
		expect(new Date(data.expired_at).getTime()).toBeGreaterThan(Date.now())
	})

	it("リクエストが正常に処理された場合のヘッダーにSet-Cookieが含まれること", async () => {
		// Act
		const response = await requestLogin({
			username: testExecutionUser.user_name,
			password: testExecutionUser.hashed_password,
		})

		// Assert
		expect(response.headers.get("Set-Cookie")).toBeDefined()
	})

	it("認証に失敗した場合、401ステータスを返すこと", async () => {
		// Arrange
		mockGetActiveUserByUsernameAndPassword.mockReturnValue(null)

		// Act
		const response = await requestLogin({
			username: "invalid_user",
			password: "invalid_password",
		})

		// Assert
		expect(response.status).toBe(401)
	})

	it("認証に失敗した場合のレスポンス内容が正しいこと", async () => {
		// Arrange
		mockGetActiveUserByUsernameAndPassword.mockReturnValue(null)

		// Act
		const response = await requestLogin({
			username: "invalid_user",
			password: "invalid_password",
		})

		// Assert
		const data = await response.json()
		expect(data).toHaveProperty("message", "Invalid username or password")
	})
})
