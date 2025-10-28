import { sign } from "jsonwebtoken"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { env } from "../../env"
import { app } from "../../index"
import { createExpiredToken, createValidToken } from "../../test/utils/auth"
import {
	type TestExecutionUser,
	createTestExecutionUser,
	deleteTestExecutionUser,
} from "../../test/utils/execution-user"

describe("GET /oauth2/userinfo - ユーザー情報取得", () => {
	const tokenSecret = env.OIDC_TOKEN_SECRET

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
		const user = await createTestExecutionUser({
			user_name: taskId,
			first_name: "UserInfo",
			last_name: "Test",
			email: "userinfo_test@example.com",
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
	 * /oauth2/userinfoへのGETリクエストを送信する
	 */
	async function requestUserInfo(authToken = testExecutionUser.access_token) {
		return await app.request("/oauth2/userinfo", {
			method: "GET",
			headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
		})
	}

	it("有効なトークンでユーザー情報を取得できること", async () => {
		// Act
		const response = await requestUserInfo()

		// Assert
		const data = await response.json()
		expect(response.status).toBe(200)
		expect(data).toEqual({
			sub: testExecutionUser.id,
			user_id: testExecutionUser.id,
			name: `${testExecutionUser.last_name} ${testExecutionUser.first_name}`,
			given_name: testExecutionUser.first_name,
			family_name: testExecutionUser.last_name,
			email: testExecutionUser.email,
			zoneinfo: testExecutionUser.timezone,
			locale: testExecutionUser.locale,
		})
	})

	it("メールがないユーザーのユーザー情報にemailが含まれないこと", async () => {
		// Arrange
		const userWithoutEmail = await createTestExecutionUser({
			user_name: `${testExecutionUser.user_name}_no_email`,
			first_name: "No",
			last_name: "Email",
			timezone: "Asia/Tokyo",
			locale: "ja-JP",
		})
		const token = createValidToken(userWithoutEmail.id)

		// Act
		const response = await requestUserInfo(token)

		// Assert
		const data = await response.json()
		expect(response.status).toBe(200)
		expect(data).toEqual({
			sub: userWithoutEmail.id,
			user_id: userWithoutEmail.id,
			name: `${userWithoutEmail.last_name} ${userWithoutEmail.first_name}`,
			given_name: userWithoutEmail.first_name,
			family_name: userWithoutEmail.last_name,
			zoneinfo: userWithoutEmail.timezone,
			locale: userWithoutEmail.locale,
		})

		// Cleanup
		await deleteTestExecutionUser(userWithoutEmail.id)
	})

	describe("認証エラーの場合に適切なエラーを返すこと", () => {
		it.each([
			{
				title: "認証ヘッダーがない場合",
				tokenBuilder: () => "",
				expectedStatus: 401,
			},
			{
				title: "不正な認証ヘッダーフォーマットの場合",
				tokenBuilder: () => "InvalidFormat token_here",
				expectedStatus: 400,
			},
			{
				title: "期限切れトークンの場合",
				tokenBuilder: (userId: string) => createExpiredToken(userId),
				expectedStatus: 401,
			},
			{
				title: "不正な形式のトークンの場合",
				tokenBuilder: () => "invalid.malformed.token",
				expectedStatus: 401,
			},
			{
				title: "不正な署名のトークンの場合",
				tokenBuilder: (userId: string) =>
					sign({}, "wrong-secret-key", {
						algorithm: "HS256",
						issuer: process.env.OIDC_ISSUER,
						subject: userId,
						audience: "wrong-audience",
						expiresIn: "1h",
					}),
				expectedStatus: 401,
			},
			{
				title: "subjectがないトークンの場合",
				tokenBuilder: () =>
					sign({}, tokenSecret, {
						algorithm: "HS256",
						issuer: process.env.OIDC_ISSUER,
						audience: "no-subject-audience",
						expiresIn: "1h",
					}),
				expectedStatus: 401,
			},
			{
				title: "空のsubjectのトークンの場合",
				tokenBuilder: () =>
					sign({}, tokenSecret, {
						algorithm: "HS256",
						issuer: process.env.OIDC_ISSUER,
						subject: "",
						audience: "empty-subject-audience",
						expiresIn: "1h",
					}),
				expectedStatus: 401,
			},
		])("$title", async ({ tokenBuilder, expectedStatus }) => {
			// Arrange
			const token = tokenBuilder(testExecutionUser.id)

			// Act
			const response = await requestUserInfo(token)

			// Assert
			const data = await response.json()
			expect(response.status).toBe(expectedStatus)
			expect(data).toHaveProperty("message")
		})
	})

	it("非アクティブなユーザーの場合に401エラーを返すこと", async () => {
		// Arrange
		const nonExistentUserId = crypto.randomUUID()
		const token = createValidToken(nonExistentUserId)

		// Act
		const response = await requestUserInfo(token)

		// Assert
		const data = await response.json()
		expect(response.status).toBe(401)
		expect(data.error).toBe("invalid_token")
	})
})
