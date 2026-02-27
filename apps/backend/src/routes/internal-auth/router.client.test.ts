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
	createTestOAuthClient,
	deleteTestOAuthClientById,
	type TestOAuthClient,
} from "../../test/utils/auth"
import {
	createTestExecutionUser,
	deleteTestExecutionUser,
	type TestExecutionUser,
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

describe("GET /auth/clients/:id - OAuthクライアント情報取得エンドポイント", () => {
	// テスト実施ユーザー
	let testExecutionUser: TestExecutionUser

	// テストOAuthクライアント
	let testOAuthClient: TestOAuthClient

	beforeAll(async ({ id: taskId }) => {
		const { user, client } = await setup(taskId)
		testExecutionUser = user
		testOAuthClient = client
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

		const client = await createTestOAuthClient({
			name: "test_cli",
			secret: "test_secret_12345",
			redirect_uris: "https://example.com/callback",
			scopes: "openid,profile,email",
		})

		return { user, client }
	}

	// テストデータのクリーンアップ
	async function cleanup() {
		await deleteTestOAuthClientById(testOAuthClient.id)

		await deleteTestExecutionUser(testExecutionUser.id)
	}

	/**
	 * /auth/loginへのPOSTリクエストを送信する
	 */
	async function requestLogin(params: Record<string, string>) {
		const response = await app.request("/auth/login", {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams(params),
		})
		const cookie = response.headers.get("Set-Cookie")?.split(";")[0] || ""
		return { response, cookie }
	}

	/**
	 * /auth/client/:idへのGETリクエストを送信する
	 * @param cookie セッションCookie (nullの場合はCookieヘッダーを送信しない, undefinedの場合はtestExecutionUserのCookieヘッダーを送信する)
	 */
	async function requestClient(id?: string, cookie?: string | null) {
		const loginCookie =
			cookie === undefined
				? await requestLogin({
						username: testExecutionUser.user_name,
						password: testExecutionUser.hashed_password,
					}).then(({ cookie }) => cookie)
				: cookie

		const headers = {
			...(loginCookie ? { Cookie: loginCookie } : {}),
		}

		const clientId = id || testOAuthClient.id

		return await app.request(`/auth/clients/${clientId}`, {
			method: "GET",
			headers,
		})
	}

	it("リクエストが正常に処理された場合、200ステータスを返すこと", async () => {
		// Act
		const response = await requestClient()

		// Assert
		expect(response.status).toBe(200)
	})

	it("リクエストが正常に処理された場合のレスポンス内容が正しいこと", async () => {
		// Act
		const response = await requestClient()

		// Assert
		const data = await response.json()

		expect(data).toHaveProperty("id", testOAuthClient.id)
		expect(data).toHaveProperty("name", testOAuthClient.name)
	})

	it("対象のOAuthクライアントが存在しない場合、404エラーを返すこと", async () => {
		// Act
		const response = await requestClient(crypto.randomUUID())

		// Assert
		const data = await response.json()
		expect(response.status).toBe(404)
		expect(data.message).toBe("Client not found")
	})

	describe("セッションエラーの場合に401エラーを返すこと", () => {
		it.each([
			{
				title: "セッションが存在しない場合",
				cookie: null,
			},
			{
				title: "空のセッションCookieの場合",
				cookie: "session=",
			},
			{
				title: "無効なセッションCookieの場合",
				cookie: "session=invalid_session_token",
			},
		])("$title", async ({ cookie }) => {
			// Act
			const response = await requestClient(testOAuthClient.id, cookie)

			// Assert
			const data = await response.json()
			expect(response.status).toBe(401)
			expect(data.message).toBe("Session expired")
		})
	})
})
