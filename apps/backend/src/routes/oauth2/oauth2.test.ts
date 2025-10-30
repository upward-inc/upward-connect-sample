import { type JwtPayload, sign, verify } from "jsonwebtoken"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { env } from "../../env"
import { app } from "../../index"
import type { Jwk } from "../../schema/auth"
import {
	createExpiredRefreshToken,
	createExpiredToken,
	createRefreshToken,
	createTestJwkPrivateKey,
	createTestOAuthClient,
	createValidToken,
} from "../../test/utils/auth"
import { cleanupTestData, createTestUser } from "../../test/utils/common"
import { convertJwkToPem } from "../../utility/crypto"

describe("Auth Tests", () => {
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

	beforeAll(async () => {
		// Clean up any existing test data
		await cleanupTestData()

		// 秘密鍵を準備
		await createTestJwkPrivateKey()
	})

	afterAll(async () => {
		// Clean up all test data
		await cleanupTestData()
	})

	describe("Userinfo Endpoint", () => {
		it("should return user info for valid token", async () => {
			// Create a test user
			const testUser = await createTestUser({
				user_name: "test_user",
				first_name: "Test",
				last_name: "User",
				email: "test_user@example.com",
				timezone: "Asia/Tokyo",
				locale: "ja-JP",
			})
			const token = createValidToken(testUser.id)
			const response = await app.request("/oauth2/userinfo", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})

			const data = await response.json()
			expect(response.status).toBe(200)
			expect(data).toEqual({
				sub: testUser.id,
				user_id: testUser.id,
				name: `${testUser.last_name} ${testUser.first_name}`,
				given_name: testUser.first_name,
				family_name: testUser.last_name,
				email: testUser.email,
				zoneinfo: testUser.timezone,
				locale: testUser.locale,
			})
		})

		it("200 OK - メールがないユーザのユーザ情報にemailが含まれない", async () => {
			// テストユーザを作成
			const testUser = await createTestUser({
				user_name: "no_mail_user",
				first_name: "No",
				last_name: "Mail",
				// emailを設定しない
				timezone: "Asia/Tokyo",
				locale: "ja-JP",
			})
			const token = createValidToken(testUser.id)
			const response = await app.request("/oauth2/userinfo", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})

			const data = await response.json()
			expect(response.status).toBe(200)
			expect(data).toEqual({
				sub: testUser.id,
				user_id: testUser.id,
				name: `${testUser.last_name} ${testUser.first_name}`,
				given_name: testUser.first_name,
				family_name: testUser.last_name,
				// emailがないことを確認
				zoneinfo: testUser.timezone,
				locale: testUser.locale,
			})
		})

		it("should return 400 for invalid authorization header format", async () => {
			const response = await app.request("/oauth2/userinfo", {
				method: "GET",
				headers: {
					Authorization: "InvalidFormat token_here",
				},
			})

			const data = await response.json()
			expect(response.status).toBe(400)
			expect(data).toEqual({
				message: "Invalid authentication header",
			})
		})

		it("should return 401 for missing authorization header", async () => {
			const response = await app.request("/oauth2/userinfo", {
				method: "GET",
			})

			const data = await response.json()
			expect(response.status).toBe(401)
			expect(data).toEqual({
				message: "No authentication header",
			})
		})

		it("should return 401 for expired token", async () => {
			const testUser = await createTestUser({
				user_name: "expired_user",
				first_name: "Expired",
				last_name: "User",
				email: "expired_user@example.com",
			})
			const expiredToken = createExpiredToken(testUser.id)

			const response = await app.request("/oauth2/userinfo", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${expiredToken}`,
				},
			})

			const data = await response.json()
			expect(response.status).toBe(401)
			expect(data).toEqual({
				message: "Invalid token",
			})
		})

		it("should return 401 for malformed token", async () => {
			const response = await app.request("/oauth2/userinfo", {
				method: "GET",
				headers: {
					Authorization: "Bearer invalid.malformed.token",
				},
			})

			const data = await response.json()
			expect(response.status).toBe(401)
			expect(data).toEqual({
				message: "Invalid token",
			})
		})

		it("should return 401 for token with invalid signature", async () => {
			// Create a token with a different secret to simulate invalid signature
			const testUser = await createTestUser({
				user_name: "invalid_sig_user",
				first_name: "Invalid",
				last_name: "Signature",
				email: "invalid_sig@example.com",
			})

			// Create a token with wrong secret (simulating token signed with different key)
			const wrongSecretToken = sign({}, "wrong-secret-key", {
				algorithm: "HS256",
				issuer: process.env.OIDC_ISSUER,
				subject: testUser.id,
				audience: "wrong-audience",
				expiresIn: "1h",
			})

			const response = await app.request("/oauth2/userinfo", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${wrongSecretToken}`,
				},
			})

			const data = await response.json()
			expect(response.status).toBe(401)
			expect(data).toEqual({
				message: "Invalid token",
			})
		})

		it("should return 401 for token with missing subject", async () => {
			// Create a token without subject
			const noSubjectToken = sign({}, tokenSecret, {
				algorithm: "HS256",
				issuer: process.env.OIDC_ISSUER,
				audience: "no-subject-audience",
				expiresIn: "1h",
				// No subject specified
			})

			const response = await app.request("/oauth2/userinfo", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${noSubjectToken}`,
				},
			})

			const data = await response.json()
			expect(response.status).toBe(401)
			expect(data).toEqual({
				message: "Invalid token",
			})
		})

		it("should return 401 for token with empty subject", async () => {
			// Create a token with empty subject
			const emptySubjectToken = sign({}, tokenSecret, {
				algorithm: "HS256",
				issuer: process.env.OIDC_ISSUER,
				subject: "", // Empty subject
				audience: "empty-subject-audience",
				expiresIn: "1h",
			})

			const response = await app.request("/oauth2/userinfo", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${emptySubjectToken}`,
				},
			})

			const data = await response.json()
			expect(response.status).toBe(401)
			expect(data).toEqual({
				message: "Invalid token",
			})
		})

		it("401 Unauthorized - 非アクティブなユーザ", async () => {
			const nonExistentUserId = crypto.randomUUID()
			const token = createValidToken(nonExistentUserId)
			const response = await app.request("/oauth2/userinfo", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})

			const data = await response.json()
			expect(response.status).toBe(401)
			expect(data.error).toBe("invalid_token")
		})
	})

	describe("Token Endpoint - Refresh Token", () => {
		it("should return new tokens for valid refresh token", async () => {
			// Create a test user
			const testUser = await createTestUser({
				user_name: "refresh_user",
				first_name: "Refresh",
				last_name: "User",
				email: "refresh_user@example.com",
			})

			// Create a test OAuth client
			const testClient = await createTestOAuthClient({
				name: "refresh_cli",
				secret: "test_secret_12345",
				redirect_uris: "https://localhost:3000/callback",
				scopes: "openid,profile,email,offline_access",
			})

			// Create a refresh token
			const refreshToken = createRefreshToken(testUser.id)

			const response = await app.request("/oauth2/token", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					grant_type: "refresh_token",
					refresh_token: refreshToken,
					client_id: testClient.id,
					client_secret: testClient.secret,
				}),
			})

			const data = await response.json()
			expect(response.status).toBe(200)
			expect(data).toHaveProperty("access_token")
			expect(data).toHaveProperty("refresh_token")
			expect(data).not.toHaveProperty("id_token") // ID token should not be issued in refresh flow
			expect(data).toHaveProperty("token_type", "Bearer")
			expect(data).toHaveProperty(
				"expires_in",
				env.OIDC_TOKEN_EXPIRES_IN_MINUTE * 60,
			) // Default expiration time in seconds
		})

		it("should return 400 for invalid client_id", async () => {
			const testUser = await createTestUser({
				user_name: "refresh_user_invalid_client",
				first_name: "Refresh",
				last_name: "User",
				email: "refresh_user_invalid_client@example.com",
			})

			const refreshToken = createRefreshToken(testUser.id)
			const nonExistentClientId = crypto.randomUUID()

			const response = await app.request("/oauth2/token", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					grant_type: "refresh_token",
					refresh_token: refreshToken,
					client_id: nonExistentClientId,
					client_secret: "test_secret_12345",
				}),
			})

			const data = await response.json()
			expect(response.status).toBe(400)
			expect(data).toEqual({
				error: "invalid_grant",
				error_description: "Invalid client id",
			})
		})

		it("should return 400 for invalid client_secret", async () => {
			const testUser = await createTestUser({
				user_name: "refresh_user_invalid_secret",
				first_name: "Refresh",
				last_name: "User",
				email: "refresh_user_invalid_secret@example.com",
			})

			const testClient = await createTestOAuthClient({
				name: "inv_secret",
				secret: "test_secret_12345",
				redirect_uris: "https://localhost:3000/callback",
				scopes: "openid,profile,email,offline_access",
			})

			const refreshToken = createRefreshToken(testUser.id)

			const response = await app.request("/oauth2/token", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					grant_type: "refresh_token",
					refresh_token: refreshToken,
					client_id: testClient.id,
					client_secret: "wrong_secret",
				}),
			})

			const data = await response.json()
			expect(response.status).toBe(400)
			expect(data).toEqual({
				error: "invalid_grant",
				error_description: "Invalid client secret",
			})
		})

		it("should return 400 for expired refresh token", async () => {
			const testUser = await createTestUser({
				user_name: "refresh_user_expired",
				first_name: "Refresh",
				last_name: "User",
				email: "refresh_user_expired@example.com",
			})

			const testClient = await createTestOAuthClient({
				name: "exp_token",
				secret: "test_secret_12345",
				redirect_uris: "https://localhost:3000/callback",
				scopes: "openid,profile,email,offline_access",
			})

			const expiredRefreshToken = createExpiredRefreshToken(testUser.id)

			const response = await app.request("/oauth2/token", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					grant_type: "refresh_token",
					refresh_token: expiredRefreshToken,
					client_id: testClient.id,
					client_secret: testClient.secret,
				}),
			})

			const data = await response.json()
			expect(response.status).toBe(400)
			expect(data).toEqual({
				error: "invalid_grant",
				error_description: "Invalid refresh token",
			})
		})

		it("should return 400 for malformed refresh token", async () => {
			const testClient = await createTestOAuthClient({
				name: "malformed",
				secret: "test_secret_12345",
				redirect_uris: "https://localhost:3000/callback",
				scopes: "openid,profile,email,offline_access",
			})

			const response = await app.request("/oauth2/token", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					grant_type: "refresh_token",
					refresh_token: "invalid.malformed.token",
					client_id: testClient.id,
					client_secret: testClient.secret,
				}),
			})

			const data = await response.json()
			expect(response.status).toBe(400)
			expect(data).toEqual({
				error: "invalid_grant",
				error_description: "Invalid refresh token",
			})
		})

		it("should return 400 for non-existent user in refresh token", async () => {
			const testClient = await createTestOAuthClient({
				name: "unknown_user",
				secret: "test_secret_12345",
				redirect_uris: "https://localhost:3000/callback",
				scopes: "openid,profile,email,offline_access",
			})

			const nonExistentUserId = crypto.randomUUID()
			const refreshToken = createRefreshToken(nonExistentUserId)

			const response = await app.request("/oauth2/token", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					grant_type: "refresh_token",
					refresh_token: refreshToken,
					client_id: testClient.id,
					client_secret: testClient.secret,
				}),
			})

			const data = await response.json()
			expect(response.status).toBe(400)
			expect(data).toEqual({
				error: "invalid_grant",
				error_description: "Unknown user",
			})
		})

		it("should return 400 for unsupported grant type", async () => {
			const testClient = await createTestOAuthClient({
				name: "unsupported",
				secret: "test_secret_12345",
				redirect_uris: "https://localhost:3000/callback",
				scopes: "openid,profile,email,offline_access",
			})

			const response = await app.request("/oauth2/token", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					grant_type: "unsupported_type",
					client_id: testClient.id,
					client_secret: testClient.secret,
				}),
			})

			const data = await response.json()
			expect(response.status).toBe(400)
			expect(data.success).toBe(false)
		})

		it("400 Bad Request - クライアントのスコープにoffline_accessが含まれていない", async () => {
			const testUser = await createTestUser({
				user_name: "no_offline_access",
				first_name: "No",
				last_name: "OfflineAccess",
				email: "no_offline_access@example.com",
			})
			const testClient = await createTestOAuthClient({
				name: "no_oa_cli",
				secret: "test_secret_12345",
				redirect_uris: "https://localhost:3000/callback",
				scopes: "openid,profile,email", // offline_accessがない
			})
			const refreshToken = createRefreshToken(testUser.id)

			const response = await app.request("/oauth2/token", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					grant_type: "refresh_token",
					refresh_token: refreshToken,
					client_id: testClient.id,
					client_secret: testClient.secret,
				}),
			})

			const data = await response.json()
			expect(response.status).toBe(400)
			expect(data.error).toBe("invalid_grant")
		})
	})

	describe("Token Endpoint - Authorization Code", () => {
		it("should prevent reuse of authorization code", async () => {
			// Create a test user and client
			const testUser = await createTestUser({
				user_name: "reuse_code_user",
				first_name: "Reuse",
				last_name: "Code",
				email: "reuse_code@example.com",
			})

			const testClient = await createTestOAuthClient({
				name: "reuse_code_cli",
				secret: "test_secret_12345",
				redirect_uris: "https://example.com/callback",
				scopes: "openid,profile,email",
			})

			const token = createValidToken(testUser.id)

			// Step 1: Get authorization code
			const authorizeResponse = await app.request("/auth/authorize", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Authorization: `Bearer ${token}`,
				},
				body: new URLSearchParams({
					response_type: "code",
					client_id: testClient.id,
					redirect_uri: "https://example.com/callback",
					scope: "openid profile email",
					state: "random_state_12345",
					nonce: "random_nonce_12345",
					code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
					code_challenge_method: "S256",
				}),
			})

			const authorizeData = await authorizeResponse.json()
			expect(authorizeResponse.status).toBe(200)
			expect(authorizeData).toHaveProperty("code")

			// Step 2: Exchange authorization code for tokens (first time - should succeed)
			const firstTokenResponse = await app.request("/oauth2/token", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					grant_type: "authorization_code",
					code: authorizeData.code,
					redirect_uri: "https://example.com/callback",
					client_id: testClient.id,
					client_secret: testClient.secret,
					code_verifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
				}),
			})

			const firstTokenData = await firstTokenResponse.json()
			expect(firstTokenResponse.status).toBe(200)
			expect(firstTokenData).toHaveProperty("access_token")
			expect(firstTokenData).toHaveProperty("id_token")
			expect(firstTokenData).not.toHaveProperty("refresh_token")

			// Step 3: Try to reuse the same authorization code (should fail)
			const secondTokenResponse = await app.request("/oauth2/token", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					grant_type: "authorization_code",
					code: authorizeData.code,
					redirect_uri: "https://example.com/callback",
					client_id: testClient.id,
					client_secret: testClient.secret,
					code_verifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
				}),
			})

			const secondTokenData = await secondTokenResponse.json()
			expect(secondTokenResponse.status).toBe(400)
			expect(secondTokenData).toEqual({
				error: "invalid_grant",
				error_description: "Invalid authorization code",
			})
		})

		it("should invalidate authorization code even with invalid parameters (timing attack prevention)", async () => {
			// Create a test user and client
			const testUser = await createTestUser({
				user_name: "timing_attack_user",
				first_name: "Timing",
				last_name: "Attack",
				email: "timing_attack@example.com",
			})

			const testClient = await createTestOAuthClient({
				name: "timing_cli",
				secret: "test_secret_12345",
				redirect_uris: "https://example.com/callback",
				scopes: "openid,profile,email",
			})

			const token = createValidToken(testUser.id)

			// Step 1: Get authorization code
			const authorizeResponse = await app.request("/auth/authorize", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Authorization: `Bearer ${token}`,
				},
				body: new URLSearchParams({
					response_type: "code",
					client_id: testClient.id,
					redirect_uri: "https://example.com/callback",
					scope: "openid profile email",
					state: "random_state_12345",
					nonce: "random_nonce_12345",
					code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
					code_challenge_method: "S256",
				}),
			})

			const authorizeData = await authorizeResponse.json()
			expect(authorizeResponse.status).toBe(200)
			expect(authorizeData).toHaveProperty("code")

			// Step 2: Try to exchange with INVALID client_secret (should fail but code should be invalidated)
			const invalidSecretResponse = await app.request("/oauth2/token", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					grant_type: "authorization_code",
					code: authorizeData.code,
					redirect_uri: "https://example.com/callback",
					client_id: testClient.id,
					client_secret: "wrong_secret", // Invalid secret
					code_verifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
				}),
			})

			const invalidSecretData = await invalidSecretResponse.json()
			expect(invalidSecretResponse.status).toBe(400)
			expect(invalidSecretData).toEqual({
				error: "invalid_grant",
				error_description: "Invalid client_secret",
			})

			// Step 3: Try to exchange with VALID parameters (should fail because code was already invalidated)
			const validParamsResponse = await app.request("/oauth2/token", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					grant_type: "authorization_code",
					code: authorizeData.code,
					redirect_uri: "https://example.com/callback",
					client_id: testClient.id,
					client_secret: testClient.secret, // Correct secret
					code_verifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
				}),
			})

			const validParamsData = await validParamsResponse.json()
			expect(validParamsResponse.status).toBe(400)
			expect(validParamsData).toEqual({
				error: "invalid_grant",
				error_description: "Invalid authorization code",
			})
		})

		it("400 Bad Request - code_verifierが不正", async () => {
			// Create a test user and client
			const testUser = await createTestUser({
				user_name: "invalid_code_verifier_user",
				first_name: "Invalid",
				last_name: "CodeVerifier",
				email: "invalid_code_verifier@example.com",
			})

			const testClient = await createTestOAuthClient({
				name: "invalid_cv_cli",
				secret: "test_secret_12345",
				redirect_uris: "https://example.com/callback",
				scopes: "openid,profile,email",
			})

			const token = createValidToken(testUser.id)

			// ステップ1: 認可コードを取得
			const authorizeResponse = await app.request("/auth/authorize", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Authorization: `Bearer ${token}`,
				},
				body: new URLSearchParams({
					response_type: "code",
					client_id: testClient.id,
					redirect_uri: "https://example.com/callback",
					scope: "openid profile email",
					state: "random_state_12345",
					nonce: "random_nonce_12345",
					code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
					code_challenge_method: "S256",
				}),
			})

			const authorizeData = await authorizeResponse.json()
			expect(authorizeResponse.status).toBe(200)
			expect(authorizeData).toHaveProperty("code")

			// ステップ2: 不正なcode_verifierでトークンエンドポイントにアクセス
			const tokenResponse = await app.request("/oauth2/token", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					grant_type: "authorization_code",
					code: authorizeData.code,
					redirect_uri: "https://example.com/callback",
					client_id: testClient.id,
					client_secret: testClient.secret,
					code_verifier: "this_is_an_invalid_code_verifier___________", // 不正なcode_verifier(43文字)
				}),
			})

			const tokenData = await tokenResponse.json()
			expect(tokenResponse.status).toBe(400)
			expect(tokenData).toEqual({
				error: "invalid_grant",
				error_description: "Invalid code_verifier",
			})
		})
	})

	describe("OIDC Token Audience (aud) Validation", () => {
		it("should set aud claim in id_token equal to client_id from request", async () => {
			// Create a test user and client
			const testUser = await createTestUser({
				user_name: "aud_test_user",
				first_name: "Audience",
				last_name: "Test",
				email: "aud_test@example.com",
			})

			const testClient = await createTestOAuthClient({
				name: "aud_cli",
				secret: "test_secret_12345",
				redirect_uris: "https://example.com/callback",
				scopes: "openid,profile,email",
			})

			const token = createValidToken(testUser.id)

			// Step 1: Authorize request
			const authorizeResponse = await app.request("/auth/authorize", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Authorization: `Bearer ${token}`,
				},
				body: new URLSearchParams({
					response_type: "code",
					client_id: testClient.id,
					redirect_uri: "https://example.com/callback",
					scope: "openid profile email",
					state: "random_state_12345",
					nonce: "random_nonce_12345",
					code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
					code_challenge_method: "S256",
				}),
			})

			const authorizeData = await authorizeResponse.json()
			expect(authorizeResponse.status).toBe(200)
			expect(authorizeData).toHaveProperty("code")

			// Step 2: Exchange authorization code for tokens
			const tokenResponse = await app.request("/oauth2/token", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					grant_type: "authorization_code",
					code: authorizeData.code,
					redirect_uri: "https://example.com/callback",
					client_id: testClient.id,
					client_secret: testClient.secret,
					code_verifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
				}),
			})

			const tokenData = await tokenResponse.json()
			expect(tokenResponse.status).toBe(200)
			expect(tokenData).toHaveProperty("id_token")

			// ステップ3: Jwksエンドポイントから公開鍵群を取得
			const jwksResponse = await app.request("/oauth2/jwks", {
				method: "GET",
			})
			expect(jwksResponse.status).toBe(200)
			const jwksData = await jwksResponse.json()
			expect(jwksData).toHaveProperty("keys")

			// ステップ4: 公開鍵群からIDトークンの署名検証に使われた鍵を取得
			const kid = JSON.parse(atob(tokenData.id_token.split(".")[0])).kid
			const jwkPublicKey = jwksData.keys.find((key: Jwk) => key.kid === kid)
			expect(jwkPublicKey).toBeTruthy()
			const publicKey = convertJwkToPem(jwkPublicKey)

			// ステップ5: IDトークンを検証する
			const decodedIdToken = verify(
				tokenData.id_token,
				publicKey,
			) as DecodedIdToken

			// The audience (aud) claim should match the client_id from the request
			expect(decodedIdToken.aud).toBe(testClient.id)
			expect(decodedIdToken.sub).toBe(testUser.id)
			expect(decodedIdToken.name).toBe(
				`${testUser.last_name} ${testUser.first_name}`,
			)
		})

		it("should set aud claim in access_token equal to client_id from request", async () => {
			// Create a test user and client
			const testUser = await createTestUser({
				user_name: "aud_access_test_user",
				first_name: "Access",
				last_name: "Test",
				email: "aud_access_test@example.com",
			})

			const testClient = await createTestOAuthClient({
				name: "aud_acc_cli",
				secret: "test_secret_67890",
				redirect_uris: "https://example.com/callback",
				scopes: "openid,profile,email",
			})

			const token = createValidToken(testUser.id)

			// Step 1: Authorize request
			const authorizeResponse = await app.request("/auth/authorize", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Authorization: `Bearer ${token}`,
				},
				body: new URLSearchParams({
					response_type: "code",
					client_id: testClient.id,
					redirect_uri: "https://example.com/callback",
					scope: "openid profile email",
					state: "random_state_12345",
					nonce: "random_nonce_12345",
					code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
					code_challenge_method: "S256",
				}),
			})

			const authorizeData = await authorizeResponse.json()
			expect(authorizeResponse.status).toBe(200)
			expect(authorizeData).toHaveProperty("code")

			// Step 2: Exchange authorization code for tokens
			const tokenResponse = await app.request("/oauth2/token", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					grant_type: "authorization_code",
					code: authorizeData.code,
					redirect_uri: "https://example.com/callback",
					client_id: testClient.id,
					client_secret: testClient.secret,
					code_verifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
				}),
			})

			const tokenData = await tokenResponse.json()
			expect(tokenResponse.status).toBe(200)
			expect(tokenData).toHaveProperty("access_token")

			// Step 3: Verify aud claim in access token equals client_id
			const decodedAccessToken = verify(
				tokenData.access_token,
				tokenSecret,
			) as JwtPayload

			// The audience (aud) claim should match the client_id from the request
			expect(decodedAccessToken.aud).toBe(testClient.id)
			expect(decodedAccessToken.sub).toBe(testUser.id)
		})

		it("should maintain consistent aud claim when using refresh token", async () => {
			// Create a test user and client
			const testUser = await createTestUser({
				user_name: "aud_refresh_test_user",
				first_name: "Refresh",
				last_name: "Test",
				email: "aud_refresh_test@example.com",
			})

			const testClient = await createTestOAuthClient({
				name: "aud_ref_cli",
				secret: "test_secret_refresh_123",
				redirect_uris: "https://example.com/callback",
				scopes: "openid,profile,email,offline_access",
			})

			const token = createValidToken(testUser.id)

			// Step 1: Get initial tokens through authorization code flow
			const authorizeResponse = await app.request("/auth/authorize", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Authorization: `Bearer ${token}`,
				},
				body: new URLSearchParams({
					response_type: "code",
					client_id: testClient.id,
					redirect_uri: "https://example.com/callback",
					scope: "openid profile email offline_access",
					state: "random_state_12345",
					nonce: "random_nonce_12345",
					code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
					code_challenge_method: "S256",
				}),
			})

			const authorizeData = await authorizeResponse.json()
			expect(authorizeResponse.status).toBe(200)

			const tokenResponse = await app.request("/oauth2/token", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					grant_type: "authorization_code",
					code: authorizeData.code,
					redirect_uri: "https://example.com/callback",
					client_id: testClient.id,
					client_secret: testClient.secret,
					code_verifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
				}),
			})

			const tokenData = await tokenResponse.json()
			expect(tokenResponse.status).toBe(200)

			// Step 2: Use refresh token to get new access token
			const refreshResponse = await app.request("/oauth2/token", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					grant_type: "refresh_token",
					refresh_token: tokenData.refresh_token,
					client_id: testClient.id,
					client_secret: testClient.secret,
				}),
			})

			const refreshData = await refreshResponse.json()
			expect(refreshResponse.status).toBe(200)
			expect(refreshData).toHaveProperty("access_token")

			// Step 3: Verify aud claim in refreshed access token equals client_id
			const decodedRefreshedToken = verify(
				refreshData.access_token,
				tokenSecret,
			) as JwtPayload

			// The audience (aud) claim should still match the client_id
			expect(decodedRefreshedToken.aud).toBe(testClient.id)
			expect(decodedRefreshedToken.sub).toBe(testUser.id)
		})

		// TODO: Skip this test until we shift to `bun test` from `vitest`.
		// We use Bun.password.hash() in /login and it is not compatible with vitest
		// see: https://github.com/vitest-dev/vscode/discussions/473#discussioncomment-10740173
		//
		// `testcontainers` is not compatible with `bun test` because it uses `nan` (V8 C++ APIs)
		// see: https://github.com/oven-sh/bun/issues/7810#issuecomment-2276549353
		it.skip("should set aud claim in access_token equal to default client_id for /login", async () => {
			// Create a test user
			const testUser = await createTestUser({
				user_name: "aud_login_test_user",
				first_name: "Aud",
				last_name: "Login",
				email: "aud_login_test@example.com",
			})

			// TODO: Use the real test default client
			const testDefaultClient = {
				id: crypto.randomUUID(),
			}

			// Access login endpoint with the correct password format expected by the test utility
			const response = await app.request("/oauth2/login", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					username: testUser.user_name,
					password: "test-password-123", // Use the actual password stored in createTestUser
				}),
			})

			const responseData = await response.json()
			expect(response.status).toBe(200)
			expect(responseData).toHaveProperty("access_token")

			// Verify audience claim in access token should match default client ID
			const decodedAccessToken = verify(
				responseData.access_token,
				tokenSecret,
			) as JwtPayload
			expect(decodedAccessToken.aud).toBe(testDefaultClient.id)
		})
	})

	describe("IDトークン検証", () => {
		it("IDトークンのpayloadに全項目を含む", async () => {
			// テストユーザーとクライアントを作成
			const testUser = await createTestUser({
				user_name: "full_id_token_user",
				first_name: "Full",
				last_name: "IDToken",
				email: "full_id_token_user@example.com",
				timezone: "Asia/Tokyo",
				locale: "ja-JP",
			})

			const testClient = await createTestOAuthClient({
				name: "full_cli",
				secret: "test-client-secret",
				redirect_uris: "https://example.com/callback",
				scopes: "openid,profile,email",
			})

			const token = createValidToken(testUser.id)

			// ステップ1: 認可リクエスト
			const authorizeResponse = await app.request("/auth/authorize", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Authorization: `Bearer ${token}`,
				},
				body: new URLSearchParams({
					response_type: "code",
					client_id: testClient.id,
					redirect_uri: "https://example.com/callback",
					scope: "openid profile email",
					state: "random_state_12345",
					nonce: "random_nonce_12345",
					code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
					code_challenge_method: "S256",
				}),
			})

			const authorizeData = await authorizeResponse.json()
			expect(authorizeResponse.status).toBe(200)
			expect(authorizeData).toHaveProperty("code")

			// ステップ2: 認可コードをトークンに交換
			const tokenResponse = await app.request("/oauth2/token", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					grant_type: "authorization_code",
					code: authorizeData.code,
					redirect_uri: "https://example.com/callback",
					client_id: testClient.id,
					client_secret: testClient.secret,
					code_verifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
				}),
			})

			const tokenData = await tokenResponse.json()
			expect(tokenResponse.status).toBe(200)
			expect(tokenData).toHaveProperty("id_token")

			// ステップ3:Jwksエンドポイントから公開鍵群を取得
			const jwksResponse = await app.request("/oauth2/jwks", {
				method: "GET",
			})
			expect(jwksResponse.status).toBe(200)
			const jwksData = await jwksResponse.json()
			expect(jwksData).toHaveProperty("keys")

			// ステップ4: 公開鍵群からIDトークンの署名検証に使われた鍵を取得
			const kid = JSON.parse(atob(tokenData.id_token.split(".")[0])).kid
			const jwkPublicKey = jwksData.keys.find((key: Jwk) => key.kid === kid)
			expect(jwkPublicKey).toBeTruthy()
			const publicKey = convertJwkToPem(jwkPublicKey)

			// ステップ5: IDトークンの検証
			const decodedIdToken = verify(
				tokenData.id_token,
				publicKey,
			) as DecodedIdToken

			// IDトークンに全項目が含まれていることを検証
			expect(decodedIdToken).toHaveProperty("iss", env.OIDC_ISSUER)
			expect(decodedIdToken).toHaveProperty("sub", testUser.id)
			expect(decodedIdToken).toHaveProperty("aud", testClient.id)
			expect(decodedIdToken).toHaveProperty("exp")
			expect(decodedIdToken).toHaveProperty("iat")
			// payloadの検証
			expect(decodedIdToken).toHaveProperty("user_id", testUser.id)
			expect(decodedIdToken).toHaveProperty(
				"name",
				`${testUser.last_name} ${testUser.first_name}`,
			)
			expect(decodedIdToken).toHaveProperty("given_name", testUser.first_name)
			expect(decodedIdToken).toHaveProperty("family_name", testUser.last_name)
			expect(decodedIdToken).toHaveProperty("email", testUser.email)
			expect(decodedIdToken).toHaveProperty("zoneinfo", testUser.timezone)
			expect(decodedIdToken).toHaveProperty("locale", testUser.locale)
		})

		it("IDトークンのpayloadに必須項目のみを含む", async () => {
			// テストユーザーとクライアントを作成
			const testUser = await createTestUser({
				user_name: "min_id_token_user",
				first_name: "Min",
				last_name: "IDToken",
			})

			const testClient = await createTestOAuthClient({
				name: "min_cli",
				secret: "test-client-secret",
				redirect_uris: "https://example.com/callback",
				scopes: "openid,profile,email",
			})

			const token = createValidToken(testUser.id)

			// ステップ1: 認可リクエスト
			const authorizeResponse = await app.request("/auth/authorize", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Authorization: `Bearer ${token}`,
				},
				body: new URLSearchParams({
					response_type: "code",
					client_id: testClient.id,
					redirect_uri: "https://example.com/callback",
					scope: "openid profile email",
					state: "random_state_12345",
					nonce: "random_nonce_12345",
					code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
					code_challenge_method: "S256",
				}),
			})

			const authorizeData = await authorizeResponse.json()
			expect(authorizeResponse.status).toBe(200)
			expect(authorizeData).toHaveProperty("code")

			// ステップ2: 認可コードをトークンに交換
			const tokenResponse = await app.request("/oauth2/token", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					grant_type: "authorization_code",
					code: authorizeData.code,
					redirect_uri: "https://example.com/callback",
					client_id: testClient.id,
					client_secret: testClient.secret,
					code_verifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
				}),
			})
			const tokenData = await tokenResponse.json()
			expect(tokenResponse.status).toBe(200)
			expect(tokenData).toHaveProperty("id_token")

			// ステップ3: Jwksエンドポイントから公開鍵群を取得
			const jwksResponse = await app.request("/oauth2/jwks", {
				method: "GET",
			})
			expect(jwksResponse.status).toBe(200)
			const jwksData = await jwksResponse.json()
			expect(jwksData).toHaveProperty("keys")

			// ステップ4: 公開鍵群からIDトークンの署名検証に使われた鍵を取得
			const kid = JSON.parse(atob(tokenData.id_token.split(".")[0])).kid
			const jwkPublicKey = jwksData.keys.find((key: Jwk) => key.kid === kid)
			expect(jwkPublicKey).toBeTruthy()
			const publicKey = convertJwkToPem(jwkPublicKey)

			// ステップ5: IDトークンの検証
			const decodedIdToken = verify(
				tokenData.id_token,
				publicKey,
			) as DecodedIdToken

			// IDトークンに必須項目のみが含まれていることを検証
			expect(decodedIdToken).toHaveProperty("iss", env.OIDC_ISSUER)
			expect(decodedIdToken).toHaveProperty("sub", testUser.id)
			expect(decodedIdToken).toHaveProperty("aud", testClient.id)
			expect(decodedIdToken).toHaveProperty("exp")
			expect(decodedIdToken).toHaveProperty("iat")
			// payloadの検証
			expect(decodedIdToken).toHaveProperty("user_id", testUser.id)
			expect(decodedIdToken).toHaveProperty(
				"name",
				`${testUser.last_name} ${testUser.first_name}`,
			)
			expect(decodedIdToken).toHaveProperty("given_name", testUser.first_name)
			expect(decodedIdToken).toHaveProperty("family_name", testUser.last_name)
			// 任意項目は含まれないことを検証
			expect(decodedIdToken).not.toHaveProperty("email")
			expect(decodedIdToken).not.toHaveProperty("zoneinfo")
			expect(decodedIdToken).not.toHaveProperty("locale")
		})
	})
})
