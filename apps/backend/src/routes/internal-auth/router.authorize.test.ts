import { type JwtPayload, verify } from "jsonwebtoken"
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
import { app } from "../../index"
import { prisma } from "../../libs/prisma"
import type { Jwk } from "../../schema/auth"
import {
	createTestJwkPrivateKey,
	createTestOAuthClient,
	deleteAllTestOAuthClient,
} from "../../test/utils/auth"
import {
	type TestExecutionUser,
	createTestExecutionUser,
	deleteTestExecutionUser,
} from "../../test/utils/execution-user"
import { convertJwkToPem } from "../../utility/crypto"

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

describe("POST /auth/authorize - 認可エンドポイント", () => {
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

	beforeEach(() => {
		mockGetActiveUserByUsernameAndPassword.mockReturnValue(testExecutionUser)
	})

	afterEach(() => {
		mockGetActiveUserByUsernameAndPassword.mockReset()
	})

	// テストデータのセットアップ
	async function setup(taskId: string) {
		// 秘密鍵を準備
		await createTestJwkPrivateKey()

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
		// published_auth_codeの削除
		await prisma.published_auth_code.deleteMany({
			where: { user_id: testExecutionUser.id },
		})

		await deleteAllTestOAuthClient()

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
	 * /auth/authorizeへのPOSTリクエストを送信する
	 * @param params リクエストパラメータ
	 * @param cookie セッションCookie (nullの場合はCookieヘッダーを送信しない, undefinedの場合はtestExecutionUserのCookieヘッダーを送信する)
	 */
	async function requestAuthorize(
		params: Record<string, string>,
		cookie?: string | null,
	) {
		const loginCookie =
			cookie === undefined
				? await requestLogin({
						username: testExecutionUser.user_name,
						password: testExecutionUser.hashed_password,
					}).then(({ cookie }) => cookie)
				: cookie

		const headers = {
			"Content-Type": "application/x-www-form-urlencoded",
			...(loginCookie ? { Cookie: loginCookie } : {}),
		}

		return await app.request("/auth/authorize", {
			method: "POST",
			headers: headers,
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

	/**
	 * /oauth2/jwksへのGETリクエストを送信する
	 */
	async function requestJwks() {
		return await app.request("/oauth2/jwks", {
			method: "GET",
		})
	}

	/**
	 * IDトークンのヘッダーからkidを取得し、対応する公開鍵をPEM形式で返す
	 */
	function getPublicKeyFromIdToken(
		idToken: string,
		jwksData: { keys: Jwk[] },
	): string {
		const kid = JSON.parse(atob(idToken.split(".")[0])).kid
		const jwkPublicKey = jwksData.keys.find((key: Jwk) => key.kid === kid)
		expect(jwkPublicKey).toBeTruthy()
		const publicKey = convertJwkToPem(jwkPublicKey as Jwk)
		return publicKey
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

	describe("不正なパラメータ(state付きエラー)の場合にエラーレスポンスを返すこと", () => {
		it.each([
			{
				title: "不正なclient_idの場合",
				clientName: "inv_cid",
				clientIdOverride: crypto.randomUUID(),
				redirectUri: "https://example.com/callback",
				expectedError: "unauthorized_client",
			},
			{
				title: "不正なredirect_uriの場合",
				clientName: "inv_uri",
				clientIdOverride: null,
				redirectUri: "https://malicious-site.com/callback",
				expectedError: "invalid_request_uri",
			},
		])(
			"$title",
			async ({ clientName, clientIdOverride, redirectUri, expectedError }) => {
				// Arrange
				const testClient = await createTestOAuthClient({
					name: clientName,
					secret: "test_secret_12345",
					redirect_uris: "https://example.com/callback",
					scopes: "openid,profile,email",
				})

				const stateValue = "state-for-error-test"

				// Act
				const response = await requestAuthorize({
					response_type: "code",
					client_id: clientIdOverride || testClient.id,
					redirect_uri: redirectUri,
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
					error: expectedError,
					state: stateValue,
				})
			},
		)
	})

	it("不正なresponse_typeの場合に400エラーを返すこと", async () => {
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
		expect(data).toHaveProperty("message")
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

		// Act
		// ステップ1: nonceを含めて認可
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

		const authorizeData = await authorizeResponse.json()
		expect(authorizeResponse.status).toBe(200)
		expect(authorizeData).toHaveProperty("code")

		// ステップ2: 認可コードをトークンに交換
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
		expect(tokenData).toHaveProperty("access_token")
		expect(tokenData).toHaveProperty("id_token")
		expect(tokenData).not.toHaveProperty("refresh_token")
		expect(tokenData).toHaveProperty("token_type", "Bearer")

		// ステップ3: Jwksエンドポイントから公開鍵群を取得
		const jwksResponse = await requestJwks()
		expect(jwksResponse.status).toBe(200)
		const jwksData = await jwksResponse.json()
		expect(jwksData).toHaveProperty("keys")

		// ステップ4: 公開鍵群からIDトークンの署名検証に使われた鍵を取得
		const publicKey = getPublicKeyFromIdToken(tokenData.id_token, jwksData)

		// ステップ5: IDトークンの署名検証とデコード
		const decodedIdToken = verify(
			tokenData.id_token,
			publicKey,
		) as DecodedIdToken

		// Assert - IDトークンにnonceが含まれていることを検証
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

		// Act
		// ステップ1: 空のnonceで認可
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

		const authorizeData = await authorizeResponse.json()
		expect(authorizeResponse.status).toBe(200)
		expect(authorizeData).toHaveProperty("code")

		// ステップ2: 認可コードをトークンに交換
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

		// ステップ3: Jwksエンドポイントから公開鍵群を取得
		const jwksResponse = await requestJwks()
		expect(jwksResponse.status).toBe(200)
		const jwksData = await jwksResponse.json()
		expect(jwksData).toHaveProperty("keys")

		// ステップ4: 公開鍵群からIDトークンの署名検証に使われた鍵を取得
		const publicKey = getPublicKeyFromIdToken(tokenData.id_token, jwksData)

		// ステップ5: IDトークンの署名検証とデコード
		const decodedIdToken = verify(
			tokenData.id_token,
			publicKey,
		) as DecodedIdToken

		// Assert - 空のnonceが処理されることを検証（空文字列として扱われるべき）
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

		// Act
		// ステップ1: 特殊文字のnonceで認可
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

		const authorizeData = await authorizeResponse.json()
		expect(authorizeResponse.status).toBe(200)
		expect(authorizeData).toHaveProperty("code")

		// ステップ2: 認可コードをトークンに交換
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

		// ステップ3: Jwksエンドポイントから公開鍵群を取得
		const jwksResponse = await requestJwks()
		expect(jwksResponse.status).toBe(200)
		const jwksData = await jwksResponse.json()
		expect(jwksData).toHaveProperty("keys")

		// ステップ4: 公開鍵群からIDトークンの署名検証に使われた鍵を取得
		const publicKey = getPublicKeyFromIdToken(tokenData.id_token, jwksData)

		// ステップ5: IDトークンの署名検証とデコード
		const decodedIdToken = verify(
			tokenData.id_token,
			publicKey,
		) as DecodedIdToken

		// Assert - 特殊文字のnonceが保持されていることを検証
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

		// Act
		// ステップ1: 有効なスコープで認可を行う
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

		const authorizeData = await authorizeResponse.json()
		expect(authorizeResponse.status).toBe(200)
		expect(authorizeData).toHaveProperty("code")

		// ステップ2: 認可コードをトークンに交換する
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
		expect(tokenData).toHaveProperty("access_token")
		expect(tokenData).toHaveProperty("id_token")
		// offline_accessによりリフレッシュトークンが発行されるべき
		expect(tokenData).toHaveProperty("refresh_token")

		// ステップ3: Jwksエンドポイントから公開鍵群を取得
		const jwksResponse = await requestJwks()
		expect(jwksResponse.status).toBe(200)
		const jwksData = await jwksResponse.json()
		expect(jwksData).toHaveProperty("keys")

		// ステップ4: 公開鍵群からIDトークンの署名検証に使われた鍵を取得
		const publicKey = getPublicKeyFromIdToken(tokenData.id_token, jwksData)

		// ステップ5: IDトークンの署名検証とデコード
		const decodedIdToken = verify(
			tokenData.id_token,
			publicKey,
		) as DecodedIdToken

		// Assert -IDトークンを検証する
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

		// Act
		// ステップ1: 有効なスコープで認可を行う
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

		const authorizeData = await authorizeResponse.json()
		expect(authorizeResponse.status).toBe(200)
		expect(authorizeData).toHaveProperty("code")

		// ステップ2: 認可コードをトークンに交換する
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
		expect(tokenData).toHaveProperty("access_token")
		expect(tokenData).toHaveProperty("id_token")
		// offline_accessを要求していないためリフレッシュトークンは発行されない
		expect(tokenData).not.toHaveProperty("refresh_token")

		// ステップ3: Jwksエンドポイントから公開鍵群を取得
		const jwksResponse = await requestJwks()
		expect(jwksResponse.status).toBe(200)
		const jwksData = await jwksResponse.json()
		expect(jwksData).toHaveProperty("keys")

		// ステップ4: 公開鍵群からIDトークンの署名検証に使われた鍵を取得
		const publicKey = getPublicKeyFromIdToken(tokenData.id_token, jwksData)

		// ステップ5: IDトークンの署名検証とデコード
		const decodedIdToken = verify(
			tokenData.id_token,
			publicKey,
		) as DecodedIdToken

		// Assert -IDトークンを検証する
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

	describe("スコープエラー(state付きエラー)の場合に400エラーを返すこと", () => {
		it.each([
			{
				title: "スコープが空の場合",
				clientScopes: "openid,profile,email",
				scope: "",
			},
			{
				title: "OAuthクライアントに未登録のスコープを要求した場合",
				clientScopes: "openid,profile",
				scope: "openid profile email",
			},
			{
				title: "未認識のスコープ値を要求した場合",
				clientScopes: "openid,profile,email",
				scope: "openid profile unknown_scope",
			},
		])("$title", async ({ clientScopes, scope }) => {
			// Arrange
			const testClient = await createTestOAuthClient({
				name: "scope_test",
				secret: "test_secret_12345",
				redirect_uris: "https://example.com/callback",
				scopes: clientScopes,
			})

			// Act
			const response = await requestAuthorize({
				response_type: "code",
				client_id: testClient.id,
				redirect_uri: "https://example.com/callback",
				scope,
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
		expect(data).toHaveProperty("message")
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

	describe("PKCEパラメータ欠如の場合に400エラーを返すこと", () => {
		it.each([
			{
				title: "code_challengeがない場合",
				omitParam: "code_challenge",
			},
			{
				title: "code_challenge_methodがない場合",
				omitParam: "code_challenge_method",
			},
		])("$title", async ({ omitParam }) => {
			// Arrange
			const testClient = await createTestOAuthClient({
				name: "pkce_test",
				secret: "test_secret_12345",
				redirect_uris: "https://example.com/callback",
				scopes: "openid,profile,email",
			})

			const params: Record<string, string> = {
				response_type: "code",
				client_id: testClient.id,
				redirect_uri: "https://example.com/callback",
				scope: "openid profile email",
				state: "random-state-value-12345",
				nonce: "random-nonce-value-12345",
				code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
				code_challenge_method: "S256",
			}

			// 指定されたパラメータを削除
			delete params[omitParam]

			// Act
			const response = await requestAuthorize(params)

			// Assert
			const data = await response.json()
			expect(response.status).toBe(400)
			expect(data).toHaveProperty("message")
		})
	})

	describe("セッションエラーの場合に400エラーを返すこと", () => {
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
			// Arrange
			const testClient = await createTestOAuthClient({
				name: "sess_err_cli",
				secret: "test_secret_12345",
				redirect_uris: "https://example.com/callback",
				scopes: "openid,profile,email",
			})

			// Act
			const response = await requestAuthorize(
				{
					response_type: "code",
					client_id: testClient.id,
					redirect_uri: "https://example.com/callback",
					scope: "openid profile email",
					state: "random-state-value-12345",
					nonce: "random-nonce-value-12345",
					code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
					code_challenge_method: "S256",
				},
				cookie,
			)

			// Assert
			const data = await response.json()
			expect(response.status).toBe(400)
			expect(data.error).toBe("login_required")
			expect(data.error_description).toBe("Session expired")
			expect(data.state).toBe("random-state-value-12345")
		})
	})
})
