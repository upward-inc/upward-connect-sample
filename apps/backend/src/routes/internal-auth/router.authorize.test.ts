import { type JwtPayload, verify } from "jsonwebtoken"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { env } from "../../env"
import { app } from "../../index"
import { prisma } from "../../libs/prisma"
import { createTestOAuthClient } from "../../test/utils/auth"
import {
	type TestExecutionUser,
	createTestExecutionUser,
	deleteTestExecutionUser,
} from "../../test/utils/execution-user"

describe("POST /auth/authorize - 認可エンドポイント", () => {
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
			first_name: "InternalAuth",
			last_name: "Test",
			email: "internal_auth_test@example.com",
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

	it("有効な認可リクエストでstateとcodeを返却すること", async () => {
		// Arrange
		const testClient = await createTestOAuthClient({
			name: "auth_cli",
			secret: "test_secret_12345",
			redirect_uris: "https://example.com/callback",
			scopes: "openid,profile,email",
		})

		const stateValue = "random-state-value-12345"

		// Act
		const response = await requestAuthorize({
			response_type: "code",
			client_id: testClient.id,
			redirect_uri: "https://example.com/callback",
			scope: "openid profile email",
			state: stateValue,
			nonce: "random_nonce_12345",
			code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
			code_challenge_method: "S256",
		})

		// Assert
		const data = await response.json()
		expect(response.status).toBe(200)
		expect(data).toHaveProperty("code")
		expect(data).toHaveProperty("state", stateValue)
	})

	it("不正なclient_idの場合にstateパラメータを含むエラーレスポンスを返すこと", async () => {
		// Arrange
		const stateValue = "state-for-error-test"

		// Act
		const response = await requestAuthorize({
			response_type: "code",
			client_id: crypto.randomUUID(), // 存在しないclient ID
			redirect_uri: "https://example.com/callback",
			scope: "openid profile email",
			state: stateValue,
			nonce: "random_nonce_12345",
			code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
			code_challenge_method: "S256",
		})

		// Assert
		const data = await response.json()
		expect(response.status).toBe(400)
		expect(data).toEqual({
			error: "unauthorized_client",
			state: stateValue,
		})
	})

	it("不正なredirect_uriの場合にstateパラメータを含むエラーレスポンスを返すこと", async () => {
		// Arrange
		const testClient = await createTestOAuthClient({
			name: "inv_red",
			secret: "test_secret_12345",
			redirect_uris: "https://example.com/callback",
			scopes: "openid,profile,email",
		})

		const stateValue = "state-for-redirect-error"

		// Act
		const response = await requestAuthorize({
			response_type: "code",
			client_id: testClient.id,
			redirect_uri: "https://malicious-site.com/callback", // 登録されたURIと異なる
			scope: "openid profile email",
			state: stateValue,
			nonce: "random_nonce_12345",
			code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
			code_challenge_method: "S256",
		})

		// Assert
		const data = await response.json()
		expect(response.status).toBe(400)
		expect(data).toEqual({
			error: "invalid_request_uri",
			state: stateValue,
		})
	})

	it("不正なresponse_typeの場合にstateパラメータを含むエラーレスポンスを返すこと", async () => {
		// Arrange
		const testClient = await createTestOAuthClient({
			name: "inv_resp",
			secret: "test_secret_12345",
			redirect_uris: "https://example.com/callback",
			scopes: "openid,profile,email",
		})

		const stateValue = "state-for-response-type-error"

		// Act
		const response = await requestAuthorize({
			response_type: "token", // 不正なresponse type (codeであるべき)
			client_id: testClient.id,
			redirect_uri: "https://example.com/callback",
			scope: "openid profile email",
			state: stateValue,
			nonce: "random_nonce_12345",
			code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
			code_challenge_method: "S256",
		})

		// Assert
		const data = await response.json()
		expect(response.status).toBe(400)
		// ZodのバリデーションエラーがOAuthバリデーションより先に発生
		expect(data.success).toBe(false)
	})

	it("IDトークンにnonceクレームが含まれること", async () => {
		// Arrange
		const testClient = await createTestOAuthClient({
			name: "nonce_cli",
			secret: "test_secret_12345",
			redirect_uris: "https://example.com/callback",
			scopes: "openid,profile,email",
		})

		const nonceValue = "random-nonce-value-12345"

		// ステップ1: nonceを含めて認可
		// Act
		const authorizeResponse = await requestAuthorize({
			response_type: "code",
			client_id: testClient.id,
			redirect_uri: "https://example.com/callback",
			scope: "openid profile email",
			state: "random_state_12345",
			nonce: nonceValue,
			code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
			code_challenge_method: "S256",
		})

		// Assert
		const authorizeData = await authorizeResponse.json()
		expect(authorizeResponse.status).toBe(200)
		expect(authorizeData).toHaveProperty("code")

		// ステップ2: 認可コードをトークンに交換
		// Act
		const tokenResponse = await requestToken({
			grant_type: "authorization_code",
			code: authorizeData.code,
			redirect_uri: "https://example.com/callback",
			client_id: testClient.id,
			client_secret: testClient.secret,
			code_verifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
		})

		// Assert
		const tokenData = await tokenResponse.json()
		expect(tokenResponse.status).toBe(200)
		expect(tokenData).toHaveProperty("access_token")
		expect(tokenData).toHaveProperty("id_token")
		expect(tokenData).not.toHaveProperty("refresh_token")
		expect(tokenData).toHaveProperty("token_type", "Bearer")

		// ステップ3: IDトークンにnonceが含まれていることを検証
		// Assert
		const decodedIdToken = verify(
			tokenData.id_token,
			tokenSecret,
		) as DecodedIdToken
		expect(decodedIdToken.nonce).toBe(nonceValue)
		expect(decodedIdToken.name).toBe(
			`${testExecutionUser.last_name} ${testExecutionUser.first_name}`,
		)
		expect(decodedIdToken.sub).toBe(testExecutionUser.id)
	})

	it("空文字列のnonceパラメータを正しく処理すること", async () => {
		// Arrange
		const testClient = await createTestOAuthClient({
			name: "empty_nonce_cli",
			secret: "test_secret_12345",
			redirect_uris: "https://example.com/callback",
			scopes: "openid,profile,email",
		})

		// Act - 空のnonceで認可
		const authorizeResponse = await requestAuthorize({
			response_type: "code",
			client_id: testClient.id,
			redirect_uri: "https://example.com/callback",
			scope: "openid profile email",
			state: "random_state_12345",
			nonce: "", // 空のnonce
			code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
			code_challenge_method: "S256",
		})

		// Assert
		const authorizeData = await authorizeResponse.json()
		expect(authorizeResponse.status).toBe(200)
		expect(authorizeData).toHaveProperty("code")

		// Act - 認可コードをトークンに交換
		const tokenResponse = await requestToken({
			grant_type: "authorization_code",
			code: authorizeData.code,
			redirect_uri: "https://example.com/callback",
			client_id: testClient.id,
			client_secret: testClient.secret,
			code_verifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
		})

		// Assert
		const tokenData = await tokenResponse.json()
		expect(tokenResponse.status).toBe(200)

		// Assert - 空のnonceが処理されることを検証（空文字列として扱われるべき）
		const decodedIdToken = verify(
			tokenData.id_token,
			tokenSecret,
		) as DecodedIdToken
		// nonceは空文字列であるべき
		expect(decodedIdToken.nonce).toBe("")
	})

	it("nonce値の特殊文字を処理できること", async () => {
		// Arrange
		const testClient = await createTestOAuthClient({
			name: "sp_nonce",
			secret: "test_secret_12345",
			redirect_uris: "https://example.com/callback",
			scopes: "openid,profile,email",
		})

		// 特殊文字を含むnonceを作成（URLセーフ）
		const specialNonce = "nonce-123_ABC.xyz~!@#$%^&*()+=[]{}|;':\",./<>?"

		// Act - 特殊文字のnonceで認可
		const authorizeResponse = await requestAuthorize({
			response_type: "code",
			client_id: testClient.id,
			redirect_uri: "https://example.com/callback",
			scope: "openid profile email",
			state: "random_state_12345",
			nonce: specialNonce,
			code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
			code_challenge_method: "S256",
		})

		// Assert
		const authorizeData = await authorizeResponse.json()
		expect(authorizeResponse.status).toBe(200)
		expect(authorizeData).toHaveProperty("code")

		// Act - 認可コードをトークンに交換
		const tokenResponse = await requestToken({
			grant_type: "authorization_code",
			code: authorizeData.code,
			redirect_uri: "https://example.com/callback",
			client_id: testClient.id,
			client_secret: testClient.secret,
			code_verifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
		})

		// Assert
		const tokenData = await tokenResponse.json()
		expect(tokenResponse.status).toBe(200)

		// Assert - 特殊文字のnonceが保持されていることを検証
		const decodedIdToken = verify(
			tokenData.id_token,
			tokenSecret,
		) as DecodedIdToken
		expect(decodedIdToken.nonce).toBe(specialNonce)
	})

	it("全てのスコープを要求できること", async () => {
		// Arrange
		const testClient = await createTestOAuthClient({
			name: "all_sc_cli",
			secret: "test_secret_12345",
			redirect_uris: "https://example.com/callback",
			scopes: "openid,profile,email,offline_access",
		})

		// ステップ1: 有効なスコープで認可を行う
		// Act
		const authorizeResponse = await requestAuthorize({
			response_type: "code",
			client_id: testClient.id,
			redirect_uri: "https://example.com/callback",
			scope: "openid profile email offline_access",
			state: "random-state-value-12345",
			nonce: "random-nonce-value-12345",
			code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
			code_challenge_method: "S256",
		})

		// Assert
		const authorizeData = await authorizeResponse.json()
		expect(authorizeResponse.status).toBe(200)
		expect(authorizeData).toHaveProperty("code")

		// ステップ2: 認可コードをトークンに交換する
		// Act
		const tokenResponse = await requestToken({
			grant_type: "authorization_code",
			code: authorizeData.code,
			redirect_uri: "https://example.com/callback",
			client_id: testClient.id,
			client_secret: testClient.secret,
			code_verifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
		})

		// Assert
		const tokenData = await tokenResponse.json()
		expect(tokenResponse.status).toBe(200)
		expect(tokenData).toHaveProperty("access_token")
		expect(tokenData).toHaveProperty("id_token")
		// offline_accessによりリフレッシュトークンが発行されるべき
		expect(tokenData).toHaveProperty("refresh_token")

		// ステップ3: IDトークンを検証する
		// Assert
		const decodedIdToken = verify(
			tokenData.id_token,
			tokenSecret,
		) as DecodedIdToken
		expect(decodedIdToken.sub).toBe(testExecutionUser.id)
		// カスタムクレームは必須
		expect(decodedIdToken.user_id).toBe(testExecutionUser.id)
		// profileスコープにより含まれるべき
		expect(decodedIdToken.name).toBe(
			`${testExecutionUser.last_name} ${testExecutionUser.first_name}`,
		)
		expect(decodedIdToken.given_name).toBe(testExecutionUser.first_name)
		expect(decodedIdToken.family_name).toBe(testExecutionUser.last_name)
		expect(decodedIdToken.zoneinfo).toBe(testExecutionUser.timezone)
		expect(decodedIdToken.locale).toBe(testExecutionUser.locale)
		// emailスコープにより含まれるべき
		expect(decodedIdToken.email).toBe(testExecutionUser.email)
	})

	it("単一スコープを要求できること", async () => {
		// Arrange
		const testClient = await createTestOAuthClient({
			name: "openid_cli",
			secret: "test_secret_12345",
			redirect_uris: "https://example.com/callback",
			scopes: "openid,profile,email",
		})

		// ステップ1: 有効なスコープで認可を行う
		// Act
		const authorizeResponse = await requestAuthorize({
			response_type: "code",
			client_id: testClient.id,
			redirect_uri: "https://example.com/callback",
			scope: "openid",
			state: "random-state-value-12345",
			nonce: "random-nonce-value-12345",
			code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
			code_challenge_method: "S256",
		})

		// Assert
		const authorizeData = await authorizeResponse.json()
		expect(authorizeResponse.status).toBe(200)
		expect(authorizeData).toHaveProperty("code")

		// ステップ2: 認可コードをトークンに交換する
		// Act
		const tokenResponse = await requestToken({
			grant_type: "authorization_code",
			code: authorizeData.code,
			redirect_uri: "https://example.com/callback",
			client_id: testClient.id,
			client_secret: testClient.secret,
			code_verifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
		})

		// Assert
		const tokenData = await tokenResponse.json()
		expect(tokenResponse.status).toBe(200)
		expect(tokenData).toHaveProperty("access_token")
		expect(tokenData).toHaveProperty("id_token")
		// offline_accessを要求していないためリフレッシュトークンは発行されない
		expect(tokenData).not.toHaveProperty("refresh_token")

		// ステップ3: IDトークンを検証する
		// Assert
		const decodedIdToken = verify(
			tokenData.id_token,
			tokenSecret,
		) as DecodedIdToken
		expect(decodedIdToken.sub).toBe(testExecutionUser.id)
		// カスタムクレームは必須
		expect(decodedIdToken.user_id).toBe(testExecutionUser.id)
		// profileスコープがないため含まれない
		expect(decodedIdToken).not.toHaveProperty("name")
		expect(decodedIdToken).not.toHaveProperty("username")
		expect(decodedIdToken).not.toHaveProperty("preferred_username")
		expect(decodedIdToken).not.toHaveProperty("given_name")
		expect(decodedIdToken).not.toHaveProperty("family_name")
		// emailスコープがないため含まれない
		expect(decodedIdToken).not.toHaveProperty("email")
		expect(decodedIdToken).not.toHaveProperty("email_verified")
	})

	it("スコープが空の場合に400エラーを返すこと", async () => {
		// Arrange
		const testClient = await createTestOAuthClient({
			name: "empty_scope_cli",
			secret: "test_secret_12345",
			redirect_uris: "https://example.com/callback",
			scopes: "openid,profile,email",
		})

		// Act
		const response = await requestAuthorize({
			response_type: "code",
			client_id: testClient.id,
			redirect_uri: "https://example.com/callback",
			scope: "", // スコープが空
			state: "random-state-value-12345",
			nonce: "random-nonce-value-12345",
			code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
			code_challenge_method: "S256",
		})

		// Assert
		const data = await response.json()
		expect(response.status).toBe(400)
		expect(data).toEqual({
			error: "invalid_scope",
			state: "random-state-value-12345",
		})
	})

	it("スコープが未定義の場合に400エラーを返すこと", async () => {
		// Arrange
		const testClient = await createTestOAuthClient({
			name: "no_scope_cli",
			secret: "test_secret_12345",
			redirect_uris: "https://example.com/callback",
			scopes: "openid,profile,email,address,phone",
		})

		// Act
		const response = await requestAuthorize({
			response_type: "code",
			client_id: testClient.id,
			redirect_uri: "https://example.com/callback",
			// スコープパラメータがない
			state: "random-state-value-12345",
			nonce: "random-nonce-value-12345",
			code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
			code_challenge_method: "S256",
		})

		// Assert
		const data = await response.json()
		expect(response.status).toBe(400)
		// Zodの検証エラーはOAuth検証よりも前に来る
		expect(data.success).toBe(false)
	})

	it("OAuthクライアントに未登録のスコープを要求した場合に400エラーを返すこと", async () => {
		// Arrange
		const testClient = await createTestOAuthClient({
			name: "inv_scope",
			secret: "test_secret_12345",
			redirect_uris: "https://example.com/callback",
			scopes: "openid,profile", // emailスコープは登録されていない
		})

		// Act
		const response = await requestAuthorize({
			response_type: "code",
			client_id: testClient.id,
			redirect_uri: "https://example.com/callback",
			scope: "openid profile email", // emailスコープは登録されていない
			state: "random-state-value-12345",
			nonce: "random-nonce-value-12345",
			code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
			code_challenge_method: "S256",
		})

		// Assert
		const data = await response.json()
		expect(response.status).toBe(400)
		expect(data).toEqual({
			error: "invalid_scope",
			state: "random-state-value-12345",
		})
	})

	it("未認識のスコープ値を要求した場合に400エラーを返すこと", async () => {
		// Arrange
		const testClient = await createTestOAuthClient({
			name: "unrec_scope",
			secret: "test_secret_12345",
			redirect_uris: "https://example.com/callback",
			scopes: "openid,profile,email",
		})

		// Act
		const response = await requestAuthorize({
			response_type: "code",
			client_id: testClient.id,
			redirect_uri: "https://example.com/callback",
			scope: "openid profile unknown_scope", // unknown_scopeは未認識
			state: "random-state-value-12345",
			nonce: "random-nonce-value-12345",
			code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
			code_challenge_method: "S256",
		})

		// Assert
		const data = await response.json()
		expect(response.status).toBe(400)
		expect(data).toEqual({
			error: "invalid_scope",
			state: "random-state-value-12345",
		})
	})

	it("code_challengeとcode_challenge_methodが正しくDBに永続化されること", async () => {
		// Arrange
		const testClient = await createTestOAuthClient({
			name: "pkce_cli",
			secret: "test_secret_12345",
			redirect_uris: "https://example.com/callback",
			scopes: "openid,profile,email",
		})

		// Act
		const response = await requestAuthorize({
			response_type: "code",
			client_id: testClient.id,
			redirect_uri: "https://example.com/callback",
			scope: "openid profile email",
			state: "random-state-value-12345",
			nonce: "random-nonce-value-12345",
			code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
			code_challenge_method: "S256",
		})

		// Assert
		const data = await response.json()
		expect(response.status).toBe(200)

		const authCode = await prisma.published_auth_code.findUnique({
			where: { auth_code: data.code },
		})

		expect(authCode).toBeTruthy()
		expect(authCode?.code_challenge).toBe(
			"E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
		)
		expect(authCode?.code_challenge_method).toBe("S256")
	})

	it("code_challengeがない場合に400エラーを返すこと", async () => {
		// Arrange
		const testClient = await createTestOAuthClient({
			name: "no_cc_cli",
			secret: "test_secret_12345",
			redirect_uris: "https://example.com/callback",
			scopes: "openid,profile,email",
		})

		// Act
		const response = await requestAuthorize({
			response_type: "code",
			client_id: testClient.id,
			redirect_uri: "https://example.com/callback",
			scope: "openid profile email",
			state: "random-state-value-12345",
			nonce: "random-nonce-value-12345",
			// code_challengeパラメータがない
			code_challenge_method: "S256",
		})

		// Assert
		const data = await response.json()
		expect(response.status).toBe(400)
		// Zodの検証エラーはOAuth検証よりも前に来る
		expect(data.success).toBe(false)
	})

	it("code_challenge_methodがない場合に400エラーを返すこと", async () => {
		// Arrange
		const testClient = await createTestOAuthClient({
			name: "no_ccm_cli",
			secret: "test_secret_12345",
			redirect_uris: "https://example.com/callback",
			scopes: "openid,profile,email",
		})

		// Act
		const response = await requestAuthorize({
			response_type: "code",
			client_id: testClient.id,
			redirect_uri: "https://example.com/callback",
			scope: "openid profile email",
			state: "random-state-value-12345",
			nonce: "random-nonce-value-12345",
			code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
			// code_challenge_methodパラメータがない
		})

		// Assert
		const data = await response.json()
		expect(response.status).toBe(400)
		// Zodの検証エラーはOAuth検証よりも前に来る
		expect(data.success).toBe(false)
	})
})
