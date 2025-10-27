import { type JwtPayload, verify } from "jsonwebtoken"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { env } from "../../env"
import { app } from "../../index"
import { prisma } from "../../libs/prisma"
import {
	createExpiredRefreshToken,
	createRefreshToken,
	createTestOAuthClient,
} from "../../test/utils/auth"
import {
	type TestExecutionUser,
	createTestExecutionUser,
	deleteTestExecutionUser,
} from "../../test/utils/execution-user"

describe("POST /oauth2/token - トークンエンドポイント", () => {
	const tokenSecret = env.OIDC_TOKEN_SECRET
	interface DecodedIdToken extends JwtPayload {
		nonce: string
		user_id: string
		name: string
		given_name: string
		family_name?: string
		email?: string
		timezone: string
		locale: string
	}

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
			first_name: "Token",
			last_name: "Test",
			email: "token_test@example.com",
			timezone: "Asia/Tokyo",
			locale: "ja-JP",
		})

		return { user }
	}

	// テストデータのクリーンアップ
	async function cleanup() {
		// published_auth_codeの削除
		await prisma.published_auth_code.deleteMany({
			where: { user_id: testExecutionUser.id },
		})

		await deleteTestExecutionUser(testExecutionUser.id)
	}

	/**
	 * /oauth2/tokenへのPOSTリクエストを送信する
	 */
	async function requestToken(params: Record<string, string>) {
		return await app.request("/oauth2/token", {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams(params),
		})
	}

	/**
	 * /auth/authorizeへのPOSTリクエストを送信する
	 */
	async function requestAuthorize(
		params: Record<string, string>,
		authToken = testExecutionUser.access_token,
	) {
		return await app.request("/auth/authorize", {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Authorization: authToken ? `Bearer ${authToken}` : "",
			},
			body: new URLSearchParams(params),
		})
	}

	describe("リフレッシュトークン", () => {
		it("有効なリフレッシュトークンで新しいトークンを取得できること", async () => {
			// Arrange
			const testClient = await createTestOAuthClient({
				name: "refresh_cli",
				secret: "test_secret_12345",
				redirect_uris: "https://localhost:3000/callback",
				scopes: "openid,profile,email,offline_access",
			})

			const refreshToken = createRefreshToken(testExecutionUser.id)

			// Act
			const response = await requestToken({
				grant_type: "refresh_token",
				refresh_token: refreshToken,
				client_id: testClient.id,
				client_secret: testClient.secret,
			})

			// Assert
			const data = await response.json()
			expect(response.status).toBe(200)
			expect(data).toHaveProperty("access_token")
			expect(data).toHaveProperty("refresh_token")
			expect(data).not.toHaveProperty("id_token") // リフレッシュフローではIDトークンは発行されない
			expect(data).toHaveProperty("token_type", "Bearer")
			expect(data).toHaveProperty(
				"expires_in",
				env.OIDC_TOKEN_EXPIRES_IN_MINUTE * 60,
			)
		})

		it("不正なclient_idの場合に400エラーを返すこと", async () => {
			// Arrange
			const refreshToken = createRefreshToken(testExecutionUser.id)
			const nonExistentClientId = crypto.randomUUID()

			// Act
			const response = await requestToken({
				grant_type: "refresh_token",
				refresh_token: refreshToken,
				client_id: nonExistentClientId,
				client_secret: "test_secret_12345",
			})

			// Assert
			const data = await response.json()
			expect(response.status).toBe(400)
			expect(data).toEqual({
				error: "invalid_grant",
				error_description: "Invalid client id",
			})
		})

		it("不正なclient_secretの場合に400エラーを返すこと", async () => {
			// Arrange
			const testClient = await createTestOAuthClient({
				name: "inv_secret",
				secret: "test_secret_12345",
				redirect_uris: "https://localhost:3000/callback",
				scopes: "openid,profile,email,offline_access",
			})

			const refreshToken = createRefreshToken(testExecutionUser.id)

			// Act
			const response = await requestToken({
				grant_type: "refresh_token",
				refresh_token: refreshToken,
				client_id: testClient.id,
				client_secret: "wrong_secret",
			})

			// Assert
			const data = await response.json()
			expect(response.status).toBe(400)
			expect(data).toEqual({
				error: "invalid_grant",
				error_description: "Invalid client secret",
			})
		})

		it("期限切れリフレッシュトークンの場合に400エラーを返すこと", async () => {
			// Arrange
			const testClient = await createTestOAuthClient({
				name: "exp_token",
				secret: "test_secret_12345",
				redirect_uris: "https://localhost:3000/callback",
				scopes: "openid,profile,email,offline_access",
			})

			const expiredRefreshToken = createExpiredRefreshToken(
				testExecutionUser.id,
			)

			// Act
			const response = await requestToken({
				grant_type: "refresh_token",
				refresh_token: expiredRefreshToken,
				client_id: testClient.id,
				client_secret: testClient.secret,
			})

			// Assert
			const data = await response.json()
			expect(response.status).toBe(400)
			expect(data).toEqual({
				error: "invalid_grant",
				error_description: "Invalid refresh token",
			})
		})

		it("不正な形式のリフレッシュトークンの場合に400エラーを返すこと", async () => {
			// Arrange
			const testClient = await createTestOAuthClient({
				name: "malformed",
				secret: "test_secret_12345",
				redirect_uris: "https://localhost:3000/callback",
				scopes: "openid,profile,email,offline_access",
			})

			// Act
			const response = await requestToken({
				grant_type: "refresh_token",
				refresh_token: "invalid.malformed.token",
				client_id: testClient.id,
				client_secret: testClient.secret,
			})

			// Assert
			const data = await response.json()
			expect(response.status).toBe(400)
			expect(data).toEqual({
				error: "invalid_grant",
				error_description: "Invalid refresh token",
			})
		})

		it("存在しないユーザーのリフレッシュトークンの場合に400エラーを返すこと", async () => {
			// Arrange
			const testClient = await createTestOAuthClient({
				name: "unknown_user",
				secret: "test_secret_12345",
				redirect_uris: "https://localhost:3000/callback",
				scopes: "openid,profile,email,offline_access",
			})

			const nonExistentUserId = crypto.randomUUID()
			const refreshToken = createRefreshToken(nonExistentUserId)

			// Act
			const response = await requestToken({
				grant_type: "refresh_token",
				refresh_token: refreshToken,
				client_id: testClient.id,
				client_secret: testClient.secret,
			})

			// Assert
			const data = await response.json()
			expect(response.status).toBe(400)
			expect(data).toEqual({
				error: "invalid_grant",
				error_description: "Unknown user",
			})
		})

		it("サポートされていないgrant_typeの場合に400エラーを返すこと", async () => {
			// Arrange
			const testClient = await createTestOAuthClient({
				name: "unsupported",
				secret: "test_secret_12345",
				redirect_uris: "https://localhost:3000/callback",
				scopes: "openid,profile,email,offline_access",
			})

			// Act
			const response = await requestToken({
				grant_type: "unsupported_type",
				client_id: testClient.id,
				client_secret: testClient.secret,
			})

			// Assert
			const data = await response.json()
			expect(response.status).toBe(400)
			expect(data.success).toBe(false)
		})

		it("クライアントのスコープにoffline_accessが含まれていない場合に400エラーを返すこと", async () => {
			// Arrange
			const testClient = await createTestOAuthClient({
				name: "no_oa_cli",
				secret: "test_secret_12345",
				redirect_uris: "https://localhost:3000/callback",
				scopes: "openid,profile,email", // offline_accessがない
			})
			const refreshToken = createRefreshToken(testExecutionUser.id)

			// Act
			const response = await requestToken({
				grant_type: "refresh_token",
				refresh_token: refreshToken,
				client_id: testClient.id,
				client_secret: testClient.secret,
			})

			// Assert
			const data = await response.json()
			expect(response.status).toBe(400)
			expect(data.error).toBe("invalid_grant")
		})
	})

	describe("認可コード", () => {
		it("認可コードの再利用を防ぐこと", async () => {
			// Arrange
			const testClient = await createTestOAuthClient({
				name: "reuse_code_cli",
				secret: "test_secret_12345",
				redirect_uris: "https://example.com/callback",
				scopes: "openid,profile,email",
			})

			// Act - ステップ1: 認可コードを取得
			const authorizeResponse = await requestAuthorize({
				response_type: "code",
				client_id: testClient.id,
				redirect_uri: "https://example.com/callback",
				scope: "openid profile email",
				state: "random_state_12345",
				nonce: "random_nonce_12345",
				code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
				code_challenge_method: "S256",
			})

			// Assert - ステップ1
			const authorizeData = await authorizeResponse.json()
			expect(authorizeResponse.status).toBe(200)
			expect(authorizeData).toHaveProperty("code")

			// Act - ステップ2: 認可コードをトークンに交換（1回目 - 成功するべき）
			const firstTokenResponse = await requestToken({
				grant_type: "authorization_code",
				code: authorizeData.code,
				redirect_uri: "https://example.com/callback",
				client_id: testClient.id,
				client_secret: testClient.secret,
				code_verifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
			})

			// Assert - ステップ2
			const firstTokenData = await firstTokenResponse.json()
			expect(firstTokenResponse.status).toBe(200)
			expect(firstTokenData).toHaveProperty("access_token")
			expect(firstTokenData).toHaveProperty("id_token")
			expect(firstTokenData).not.toHaveProperty("refresh_token")

			// Act - ステップ3: 同じ認可コードを再利用しようとする（失敗するべき）
			const secondTokenResponse = await requestToken({
				grant_type: "authorization_code",
				code: authorizeData.code,
				redirect_uri: "https://example.com/callback",
				client_id: testClient.id,
				client_secret: testClient.secret,
				code_verifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
			})

			// Assert - ステップ3
			const secondTokenData = await secondTokenResponse.json()
			expect(secondTokenResponse.status).toBe(400)
			expect(secondTokenData).toEqual({
				error: "invalid_grant",
				error_description: "Invalid authorization code",
			})
		})

		it("不正なパラメータでも認可コードを無効化すること（タイミング攻撃対策）", async () => {
			// Arrange
			const testClient = await createTestOAuthClient({
				name: "timing_cli",
				secret: "test_secret_12345",
				redirect_uris: "https://example.com/callback",
				scopes: "openid,profile,email",
			})

			// Act - ステップ1: 認可コードを取得
			const authorizeResponse = await requestAuthorize({
				response_type: "code",
				client_id: testClient.id,
				redirect_uri: "https://example.com/callback",
				scope: "openid profile email",
				state: "random_state_12345",
				nonce: "random_nonce_12345",
				code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
				code_challenge_method: "S256",
			})

			// Assert - ステップ1
			const authorizeData = await authorizeResponse.json()
			expect(authorizeResponse.status).toBe(200)
			expect(authorizeData).toHaveProperty("code")

			// Act - ステップ2: 不正なclient_secretでトークン交換を試みる（失敗するがコードは無効化されるべき）
			const invalidSecretResponse = await requestToken({
				grant_type: "authorization_code",
				code: authorizeData.code,
				redirect_uri: "https://example.com/callback",
				client_id: testClient.id,
				client_secret: "wrong_secret", // 不正なsecret
				code_verifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
			})

			// Assert - ステップ2
			const invalidSecretData = await invalidSecretResponse.json()
			expect(invalidSecretResponse.status).toBe(400)
			expect(invalidSecretData).toEqual({
				error: "invalid_grant",
				error_description: "Invalid client_secret",
			})

			// Act - ステップ3: 正しいパラメータでトークン交換を試みる（コードが既に無効化されているため失敗するべき）
			const validParamsResponse = await requestToken({
				grant_type: "authorization_code",
				code: authorizeData.code,
				redirect_uri: "https://example.com/callback",
				client_id: testClient.id,
				client_secret: testClient.secret, // 正しいsecret
				code_verifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
			})

			// Assert - ステップ3
			const validParamsData = await validParamsResponse.json()
			expect(validParamsResponse.status).toBe(400)
			expect(validParamsData).toEqual({
				error: "invalid_grant",
				error_description: "Invalid authorization code",
			})
		})

		it("不正なcode_verifierの場合に400エラーを返すこと", async () => {
			// Arrange
			const testClient = await createTestOAuthClient({
				name: "invalid_cv_cli",
				secret: "test_secret_12345",
				redirect_uris: "https://example.com/callback",
				scopes: "openid,profile,email",
			})

			// Act - ステップ1: 認可コードを取得
			const authorizeResponse = await requestAuthorize({
				response_type: "code",
				client_id: testClient.id,
				redirect_uri: "https://example.com/callback",
				scope: "openid profile email",
				state: "random_state_12345",
				nonce: "random_nonce_12345",
				code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
				code_challenge_method: "S256",
			})

			// Assert - ステップ1
			const authorizeData = await authorizeResponse.json()
			expect(authorizeResponse.status).toBe(200)
			expect(authorizeData).toHaveProperty("code")

			// Act - ステップ2: 不正なcode_verifierでトークンエンドポイントにアクセス
			const tokenResponse = await requestToken({
				grant_type: "authorization_code",
				code: authorizeData.code,
				redirect_uri: "https://example.com/callback",
				client_id: testClient.id,
				client_secret: testClient.secret,
				code_verifier: "this_is_an_invalid_code_verifier___________", // 不正なcode_verifier(43文字)
			})

			// Assert - ステップ2
			const tokenData = await tokenResponse.json()
			expect(tokenResponse.status).toBe(400)
			expect(tokenData).toEqual({
				error: "invalid_grant",
				error_description: "Invalid code_verifier",
			})
		})
	})

	describe("OIDC Token Audience (aud) 検証", () => {
		it("id_tokenのaudクレームがclient_idと等しいこと", async () => {
			// Arrange
			const testClient = await createTestOAuthClient({
				name: "aud_cli",
				secret: "test_secret_12345",
				redirect_uris: "https://example.com/callback",
				scopes: "openid,profile,email",
			})

			// Act - ステップ1: 認可リクエスト
			const authorizeResponse = await requestAuthorize({
				response_type: "code",
				client_id: testClient.id,
				redirect_uri: "https://example.com/callback",
				scope: "openid profile email",
				state: "random_state_12345",
				nonce: "random_nonce_12345",
				code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
				code_challenge_method: "S256",
			})

			// Assert - ステップ1
			const authorizeData = await authorizeResponse.json()
			expect(authorizeResponse.status).toBe(200)
			expect(authorizeData).toHaveProperty("code")

			// Act - ステップ2: 認可コードをトークンに交換
			const tokenResponse = await requestToken({
				grant_type: "authorization_code",
				code: authorizeData.code,
				redirect_uri: "https://example.com/callback",
				client_id: testClient.id,
				client_secret: testClient.secret,
				code_verifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
			})

			// Assert - ステップ2
			const tokenData = await tokenResponse.json()
			expect(tokenResponse.status).toBe(200)
			expect(tokenData).toHaveProperty("id_token")

			// Act - ステップ3: IDトークンのaudクレームを検証
			const decodedIdToken = verify(
				tokenData.id_token,
				tokenSecret,
			) as DecodedIdToken

			// Assert - ステップ3
			// audクレームはclient_idと一致するべき
			expect(decodedIdToken.aud).toBe(testClient.id)
			expect(decodedIdToken.sub).toBe(testExecutionUser.id)
			expect(decodedIdToken.name).toBe(
				`${testExecutionUser.last_name} ${testExecutionUser.first_name}`,
			)
		})

		it("access_tokenのaudクレームがclient_idと等しいこと", async () => {
			// Arrange
			const testClient = await createTestOAuthClient({
				name: "aud_acc_cli",
				secret: "test_secret_67890",
				redirect_uris: "https://example.com/callback",
				scopes: "openid,profile,email",
			})

			// Act - ステップ1: 認可リクエスト
			const authorizeResponse = await requestAuthorize({
				response_type: "code",
				client_id: testClient.id,
				redirect_uri: "https://example.com/callback",
				scope: "openid profile email",
				state: "random_state_12345",
				nonce: "random_nonce_12345",
				code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
				code_challenge_method: "S256",
			})

			// Assert - ステップ1
			const authorizeData = await authorizeResponse.json()
			expect(authorizeResponse.status).toBe(200)
			expect(authorizeData).toHaveProperty("code")

			// Act - ステップ2: 認可コードをトークンに交換
			const tokenResponse = await requestToken({
				grant_type: "authorization_code",
				code: authorizeData.code,
				redirect_uri: "https://example.com/callback",
				client_id: testClient.id,
				client_secret: testClient.secret,
				code_verifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
			})

			// Assert - ステップ2
			const tokenData = await tokenResponse.json()
			expect(tokenResponse.status).toBe(200)
			expect(tokenData).toHaveProperty("access_token")

			// Act - ステップ3: アクセストークンのaudクレームを検証
			const decodedAccessToken = verify(
				tokenData.access_token,
				tokenSecret,
			) as JwtPayload

			// Assert - ステップ3
			// audクレームはclient_idと一致するべき
			expect(decodedAccessToken.aud).toBe(testClient.id)
			expect(decodedAccessToken.sub).toBe(testExecutionUser.id)
		})

		it("リフレッシュトークン使用時にaudクレームが一貫していること", async () => {
			// Arrange
			const testClient = await createTestOAuthClient({
				name: "aud_ref_cli",
				secret: "test_secret_refresh_123",
				redirect_uris: "https://example.com/callback",
				scopes: "openid,profile,email,offline_access",
			})

			// Act - ステップ1: 認可コードフローで初回トークンを取得
			const authorizeResponse = await requestAuthorize({
				response_type: "code",
				client_id: testClient.id,
				redirect_uri: "https://example.com/callback",
				scope: "openid profile email offline_access",
				state: "random_state_12345",
				nonce: "random_nonce_12345",
				code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
				code_challenge_method: "S256",
			})

			// Assert - ステップ1
			const authorizeData = await authorizeResponse.json()
			expect(authorizeResponse.status).toBe(200)

			const tokenResponse = await requestToken({
				grant_type: "authorization_code",
				code: authorizeData.code,
				redirect_uri: "https://example.com/callback",
				client_id: testClient.id,
				client_secret: testClient.secret,
				code_verifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
			})

			const tokenData = await tokenResponse.json()
			expect(tokenResponse.status).toBe(200)

			// Act - ステップ2: リフレッシュトークンを使用して新しいアクセストークンを取得
			const refreshResponse = await requestToken({
				grant_type: "refresh_token",
				refresh_token: tokenData.refresh_token,
				client_id: testClient.id,
				client_secret: testClient.secret,
			})

			// Assert - ステップ2
			const refreshData = await refreshResponse.json()
			expect(refreshResponse.status).toBe(200)
			expect(refreshData).toHaveProperty("access_token")

			// Act - ステップ3: リフレッシュされたアクセストークンのaudクレームを検証
			const decodedRefreshedToken = verify(
				refreshData.access_token,
				tokenSecret,
			) as JwtPayload

			// Assert - ステップ3
			// audクレームは引き続きclient_idと一致するべき
			expect(decodedRefreshedToken.aud).toBe(testClient.id)
			expect(decodedRefreshedToken.sub).toBe(testExecutionUser.id)
		})

		// TODO: Bun.password.hash()の互換性の問題でスキップ
		// see: https://github.com/vitest-dev/vscode/discussions/473#discussioncomment-10740173
		// testcontainersは`bun test`と互換性がない
		// see: https://github.com/oven-sh/bun/issues/7810#issuecomment-2276549353
		it.skip("ログインエンドポイントのaccess_tokenのaudクレームがデフォルトのclient_idと等しいこと", async () => {
			// Arrange
			// TODO: 実際のテストデフォルトクライアントを使用する
			const testDefaultClient = {
				id: crypto.randomUUID(),
			}

			// Act
			// ログインエンドポイントにアクセス
			const response = await app.request("/oauth2/login", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					username: testExecutionUser.user_name,
					password: "test-password-123",
				}),
			})

			const responseData = await response.json()
			expect(response.status).toBe(200)
			expect(responseData).toHaveProperty("access_token")

			// Assert
			// アクセストークンのaudクレームがデフォルトのclient_idと一致することを検証
			const decodedAccessToken = verify(
				responseData.access_token,
				tokenSecret,
			) as JwtPayload
			expect(decodedAccessToken.aud).toBe(testDefaultClient.id)
		})
	})

	describe("IDトークン検証", () => {
		it("IDトークンのpayloadに全項目を含むこと", async () => {
			// Arrange
			const testClient = await createTestOAuthClient({
				name: "full_cli",
				secret: "test-client-secret",
				redirect_uris: "https://example.com/callback",
				scopes: "openid,profile,email",
			})

			// Act - ステップ1: 認可リクエスト
			const authorizeResponse = await requestAuthorize({
				response_type: "code",
				client_id: testClient.id,
				redirect_uri: "https://example.com/callback",
				scope: "openid profile email",
				state: "random_state_12345",
				nonce: "random_nonce_12345",
				code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
				code_challenge_method: "S256",
			})

			// Assert - ステップ1
			const authorizeData = await authorizeResponse.json()
			expect(authorizeResponse.status).toBe(200)
			expect(authorizeData).toHaveProperty("code")

			// Act - ステップ2: 認可コードをトークンに交換
			const tokenResponse = await requestToken({
				grant_type: "authorization_code",
				code: authorizeData.code,
				redirect_uri: "https://example.com/callback",
				client_id: testClient.id,
				client_secret: testClient.secret,
				code_verifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
			})

			// Assert - ステップ2
			const tokenData = await tokenResponse.json()
			expect(tokenResponse.status).toBe(200)
			expect(tokenData).toHaveProperty("id_token")

			// Act - ステップ3: IDトークンの検証
			const decodedIdToken = verify(
				tokenData.id_token,
				tokenSecret,
			) as DecodedIdToken

			// Assert - ステップ3
			// IDトークンに全項目が含まれていることを検証
			expect(decodedIdToken).toHaveProperty("iss", env.OIDC_ISSUER)
			expect(decodedIdToken).toHaveProperty("sub", testExecutionUser.id)
			expect(decodedIdToken).toHaveProperty("aud", testClient.id)
			expect(decodedIdToken).toHaveProperty("exp")
			expect(decodedIdToken).toHaveProperty("iat")
			// payloadの検証
			expect(decodedIdToken).toHaveProperty("user_id", testExecutionUser.id)
			expect(decodedIdToken).toHaveProperty(
				"name",
				`${testExecutionUser.last_name} ${testExecutionUser.first_name}`,
			)
			expect(decodedIdToken).toHaveProperty(
				"given_name",
				testExecutionUser.first_name,
			)
			expect(decodedIdToken).toHaveProperty(
				"family_name",
				testExecutionUser.last_name,
			)
			expect(decodedIdToken).toHaveProperty("email", testExecutionUser.email)
			expect(decodedIdToken).toHaveProperty(
				"zoneinfo",
				testExecutionUser.timezone,
			)
			expect(decodedIdToken).toHaveProperty("locale", testExecutionUser.locale)
		})

		// it("IDトークンのpayloadに必須項目のみを含むこと", async () => {
		// 	// Arrange
		// 	const userWithoutOptionalFields = await createTestExecutionUser({
		// 		user_name: `${testExecutionUser.user_name}_min`,
		// 		first_name: "Min",
		// 		last_name: "IDToken",
		// 	})

		// 	const testClient = await createTestOAuthClient({
		// 		name: "min_cli",
		// 		secret: "test-client-secret",
		// 		redirect_uris: "https://example.com/callback",
		// 		scopes: "openid,profile,email",
		// 	})

		// 	// Act - ステップ1: 認可リクエスト
		// 	const authorizeResponse = await requestAuthorize(
		// 		{
		// 			response_type: "code",
		// 			client_id: testClient.id,
		// 			redirect_uri: "https://example.com/callback",
		// 			scope: "openid profile email",
		// 			state: "random_state_12345",
		// 			nonce: "random_nonce_12345",
		// 			code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
		// 			code_challenge_method: "S256",
		// 		},
		// 		userWithoutOptionalFields.access_token,
		// 	)

		// 	// Assert - ステップ1
		// 	const authorizeData = await authorizeResponse.json()
		// 	expect(authorizeResponse.status).toBe(200)
		// 	expect(authorizeData).toHaveProperty("code")

		// 	// Act - ステップ2: 認可コードをトークンに交換
		// 	const tokenResponse = await requestToken({
		// 		grant_type: "authorization_code",
		// 		code: authorizeData.code,
		// 		redirect_uri: "https://example.com/callback",
		// 		client_id: testClient.id,
		// 		client_secret: testClient.secret,
		// 		code_verifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
		// 	})

		// 	// Assert - ステップ2
		// 	const tokenData = await tokenResponse.json()
		// 	expect(tokenResponse.status).toBe(200)
		// 	expect(tokenData).toHaveProperty("id_token")

		// 	// Act - ステップ3: IDトークンの検証
		// 	const decodedIdToken = verify(
		// 		tokenData.id_token,
		// 		tokenSecret,
		// 	) as DecodedIdToken

		// 	// Assert - ステップ3
		// 	// IDトークンに必須項目のみが含まれていることを検証
		// 	expect(decodedIdToken).toHaveProperty("iss", env.OIDC_ISSUER)
		// 	expect(decodedIdToken).toHaveProperty("sub", userWithoutOptionalFields.id)
		// 	expect(decodedIdToken).toHaveProperty("aud", testClient.id)
		// 	expect(decodedIdToken).toHaveProperty("exp")
		// 	expect(decodedIdToken).toHaveProperty("iat")
		// 	// payloadの検証
		// 	expect(decodedIdToken).toHaveProperty(
		// 		"user_id",
		// 		userWithoutOptionalFields.id,
		// 	)
		// 	expect(decodedIdToken).toHaveProperty(
		// 		"name",
		// 		`${userWithoutOptionalFields.last_name} ${userWithoutOptionalFields.first_name}`,
		// 	)
		// 	expect(decodedIdToken).toHaveProperty(
		// 		"given_name",
		// 		userWithoutOptionalFields.first_name,
		// 	)
		// 	expect(decodedIdToken).toHaveProperty(
		// 		"family_name",
		// 		userWithoutOptionalFields.last_name,
		// 	)
		// 	// 任意項目は含まれないことを検証
		// 	expect(decodedIdToken).not.toHaveProperty("email")
		// 	expect(decodedIdToken).not.toHaveProperty("zoneinfo")
		// 	expect(decodedIdToken).not.toHaveProperty("locale")

		// 	// クリーンアップ
		// 	await deleteTestExecutionUser(userWithoutOptionalFields.id)
		// })
	})
})
