import { type JwtPayload, verify } from "jsonwebtoken"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { env } from "../../env"
import { app } from "../../index"
import { createTestOAuthClient, createValidToken } from "../../test/utils/auth"
import { cleanupTestData, createTestUser } from "../../test/utils/common"

describe("Internal Auth Tests", () => {
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
	})

	afterAll(async () => {
		// Clean up all test data
		await cleanupTestData()
	})

	describe("Authorize Endpoint", () => {
		it("should return state and code for valid authorization request", async () => {
			// Create a test user and client
			const testUser = await createTestUser({
				user_name: "auth_user",
				first_name: "Auth",
				last_name: "User",
				email: "auth_user@example.com",
			})

			const testClient = await createTestOAuthClient({
				name: "auth_cli",
				secret: "test_secret_12345",
				redirect_uris: "https://example.com/callback",
				scopes: "openid,profile,email",
			})

			const stateValue = "random-state-value-12345"
			const token = createValidToken(testUser.id)

			const response = await app.request("/auth/authorize", {
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
					state: stateValue,
					nonce: "random_nonce_12345",
				}),
			})

			const data = await response.json()
			expect(response.status).toBe(200)
			expect(data).toHaveProperty("code")
			expect(data).toHaveProperty("state", stateValue)
		})

		it("should return state parameter in error responses - invalid client_id", async () => {
			const testUser = await createTestUser({
				user_name: "invalid_client_user",
				first_name: "Invalid",
				last_name: "Client",
				email: "invalid_client@example.com",
			})

			const stateValue = "state-for-error-test"
			const token = createValidToken(testUser.id)

			const response = await app.request("/auth/authorize", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Authorization: `Bearer ${token}`,
				},
				body: new URLSearchParams({
					response_type: "code",
					client_id: crypto.randomUUID(), // Nonexistent client ID
					redirect_uri: "https://example.com/callback",
					scope: "openid profile email",
					state: stateValue,
					nonce: "random_nonce_12345",
				}),
			})

			const data = await response.json()
			expect(response.status).toBe(400)
			expect(data).toHaveProperty("error")
			expect(data).toEqual({
				error: "unauthorized_client",
				state: stateValue,
			})
		})

		it("should return state parameter in error responses - invalid redirect_uri", async () => {
			const testUser = await createTestUser({
				user_name: "invalid_redirect_user",
				first_name: "Invalid",
				last_name: "Redirect",
				email: "invalid_redirect@example.com",
			})

			const testClient = await createTestOAuthClient({
				name: "inv_red",
				secret: "test_secret_12345",
				redirect_uris: "https://example.com/callback",
				scopes: "openid,profile,email",
			})

			const stateValue = "state-for-redirect-error"
			const token = createValidToken(testUser.id)

			const response = await app.request("/auth/authorize", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Authorization: `Bearer ${token}`,
				},
				body: new URLSearchParams({
					response_type: "code",
					client_id: testClient.id,
					redirect_uri: "https://malicious-site.com/callback", // Different from registered URI
					scope: "openid profile email",
					state: stateValue,
					nonce: "random_nonce_12345",
				}),
			})

			const data = await response.json()
			expect(response.status).toBe(400)
			expect(data).toEqual({
				error: "invalid_request_uri",
				state: stateValue,
			})
		})

		it("should return state parameter in error responses - invalid response_type", async () => {
			const testUser = await createTestUser({
				user_name: "invalid_response_type_user",
				first_name: "Invalid",
				last_name: "ResponseType",
				email: "invalid_response_type@example.com",
			})

			const testClient = await createTestOAuthClient({
				name: "inv_resp",
				secret: "test_secret_12345",
				redirect_uris: "https://example.com/callback",
				scopes: "openid,profile,email",
			})

			const stateValue = "state-for-response-type-error"
			const token = createValidToken(testUser.id)

			const response = await app.request("/auth/authorize", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Authorization: `Bearer ${token}`,
				},
				body: new URLSearchParams({
					response_type: "token", // Invalid response type (should be "code")
					client_id: testClient.id,
					redirect_uri: "https://example.com/callback",
					scope: "openid profile email",
					state: stateValue,
					nonce: "random_nonce_12345",
				}),
			})

			const data = await response.json()
			expect(response.status).toBe(400)
			// Zod validation error for invalid response_type comes before OAuth validation
			expect(data.success).toBe(false)
		})

		it("should contain nonce claim in ID token", async () => {
			// Create a test user and client
			const testUser = await createTestUser({
				user_name: "nonce_user",
				first_name: "Nonce",
				last_name: "User",
				email: "nonce_user@example.com",
			})

			const testClient = await createTestOAuthClient({
				name: "nonce_cli",
				secret: "test_secret_12345",
				redirect_uris: "https://example.com/callback",
				scopes: "openid,profile,email",
			})

			const nonceValue = "random-nonce-value-12345"
			const token = createValidToken(testUser.id)

			// Step 1: Authorize with nonce
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
					nonce: nonceValue,
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
				}),
			})

			const tokenData = await tokenResponse.json()
			expect(tokenResponse.status).toBe(200)
			expect(tokenData).toHaveProperty("access_token")
			expect(tokenData).toHaveProperty("id_token")
			expect(tokenData).not.toHaveProperty("refresh_token")
			expect(tokenData).toHaveProperty("token_type", "Bearer")

			// Step 3: Verify nonce is included in ID token
			const decodedIdToken = verify(
				tokenData.id_token,
				tokenSecret,
			) as DecodedIdToken
			expect(decodedIdToken.nonce).toBe(nonceValue)
			expect(decodedIdToken.name).toBe(
				`${testUser.last_name} ${testUser.first_name}`,
			)
			expect(decodedIdToken.sub).toBe(testUser.id)
		})

		it("should handle empty string as nonce parameter correctly", async () => {
			// Create a test user and client
			const testUser = await createTestUser({
				user_name: "empty_nonce_user",
				first_name: "Empty",
				last_name: "Nonce",
				email: "empty_nonce@example.com",
			})

			const testClient = await createTestOAuthClient({
				name: "empty_nonce_cli",
				secret: "test_secret_12345",
				redirect_uris: "https://example.com/callback",
				scopes: "openid,profile,email",
			})

			const token = createValidToken(testUser.id)

			// Authorize with empty nonce
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
					nonce: "", // Empty nonce
				}),
			})

			const authorizeData = await authorizeResponse.json()
			expect(authorizeResponse.status).toBe(200)
			expect(authorizeData).toHaveProperty("code")

			// Exchange authorization code for tokens
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
				}),
			})

			const tokenData = await tokenResponse.json()
			expect(tokenResponse.status).toBe(200)

			// Verify empty nonce is handled (should be treated as empty string)
			const decodedIdToken = verify(
				tokenData.id_token,
				tokenSecret,
			) as DecodedIdToken
			// Nonce should be empty string
			expect(decodedIdToken.nonce).toBe("")
		})

		it("should handle special characters in nonce values", async () => {
			// Create a test user and client
			const testUser = await createTestUser({
				user_name: "special_nonce_user",
				first_name: "Special",
				last_name: "Nonce",
				email: "special_nonce@example.com",
			})

			const testClient = await createTestOAuthClient({
				name: "sp_nonce",
				secret: "test_secret_12345",
				redirect_uris: "https://example.com/callback",
				scopes: "openid,profile,email",
			})

			// Create a nonce with special characters (URL-safe)
			const specialNonce = "nonce-123_ABC.xyz~!@#$%^&*()+=[]{}|;':\",./<>?"
			const token = createValidToken(testUser.id)

			// Authorize with special character nonce
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
					nonce: specialNonce,
				}),
			})

			const authorizeData = await authorizeResponse.json()
			expect(authorizeResponse.status).toBe(200)
			expect(authorizeData).toHaveProperty("code")

			// Exchange authorization code for tokens
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
				}),
			})

			const tokenData = await tokenResponse.json()
			expect(tokenResponse.status).toBe(200)

			// Verify special character nonce is preserved
			const decodedIdToken = verify(
				tokenData.id_token,
				tokenSecret,
			) as DecodedIdToken
			expect(decodedIdToken.nonce).toBe(specialNonce)
		})

		it("200 OK - 全てのスコープを要求する", async () => {
			const testUser = await createTestUser({
				user_name: "all_scope_user",
				first_name: "All",
				last_name: "Scope",
				email: "all_scope@example.com",
				timezone: "Asia/Tokyo",
				locale: "ja-JP",
			})

			const testClient = await createTestOAuthClient({
				name: "all_sc_cli",
				secret: "test_secret_12345",
				redirect_uris: "https://example.com/callback",
				scopes: "openid,profile,email,offline_access",
			})

			const token = createValidToken(testUser.id)

			// ステップ１：有効なスコープで認可を行う
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
					state: "random-state-value-12345",
					nonce: "random-nonce-value-12345",
				}),
			})

			const authorizeData = await authorizeResponse.json()
			expect(authorizeResponse.status).toBe(200)
			expect(authorizeData).toHaveProperty("code")

			// ステップ２：認可コードをトークンに交換する
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
				}),
			})

			const tokenData = await tokenResponse.json()
			expect(tokenResponse.status).toBe(200)
			expect(tokenData).toHaveProperty("access_token")
			expect(tokenData).toHaveProperty("id_token")
			// offline_accessによりリフレッシュトークンが発行されるべき
			expect(tokenData).toHaveProperty("refresh_token")

			// ステップ３：IDトークンを検証する
			const decodedIdToken = verify(
				tokenData.id_token,
				tokenSecret,
			) as DecodedIdToken
			expect(decodedIdToken.sub).toBe(testUser.id)
			// カスタムクレームは必須
			expect(decodedIdToken.user_id).toBe(testUser.id)
			// profileスコープにより含まれるべき
			expect(decodedIdToken.name).toBe(
				`${testUser.last_name} ${testUser.first_name}`,
			)
			expect(decodedIdToken.given_name).toBe(testUser.first_name)
			expect(decodedIdToken.family_name).toBe(testUser.last_name)
			expect(decodedIdToken.zoneinfo).toBe(testUser.timezone)
			expect(decodedIdToken.locale).toBe(testUser.locale)
			// emailスコープにより含まれるべき
			expect(decodedIdToken.email).toBe(testUser.email)
		})

		it("200 OK - 単一スコープを要求する", async () => {
			const testUser = await createTestUser({
				user_name: "openid_scope_user",
				first_name: "Openid",
				last_name: "Scope",
				email: "openid_scope@example.com",
			})

			const testClient = await createTestOAuthClient({
				name: "openid_cli",
				secret: "test_secret_12345",
				redirect_uris: "https://example.com/callback",
				scopes: "openid,profile,email",
			})

			const token = createValidToken(testUser.id)

			// ステップ１：有効なスコープで認可を行う
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
					scope: "openid",
					state: "random-state-value-12345",
					nonce: "random-nonce-value-12345",
				}),
			})

			const authorizeData = await authorizeResponse.json()
			expect(authorizeResponse.status).toBe(200)
			expect(authorizeData).toHaveProperty("code")

			// ステップ２：認可コードをトークンに交換する
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
				}),
			})

			const tokenData = await tokenResponse.json()
			expect(tokenResponse.status).toBe(200)
			expect(tokenData).toHaveProperty("access_token")
			expect(tokenData).toHaveProperty("id_token")
			// offline_accessを要求していないためリフレッシュトークンは発行されない
			expect(tokenData).not.toHaveProperty("refresh_token")

			// ステップ３：IDトークンを検証する
			const decodedIdToken = verify(
				tokenData.id_token,
				tokenSecret,
			) as DecodedIdToken
			expect(decodedIdToken.sub).toBe(testUser.id)
			// カスタムクレームは必須
			expect(decodedIdToken.user_id).toBe(testUser.id)
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

		it("400 Bad Request - スコープが空", async () => {
			const testUser = await createTestUser({
				user_name: "empty_scope_user",
				first_name: "Empty",
				last_name: "Scope",
				email: "empty_scope@example.com",
			})

			const testClient = await createTestOAuthClient({
				name: "empty_scope_cli",
				secret: "test_secret_12345",
				redirect_uris: "https://example.com/callback",
				scopes: "openid,profile,email",
			})

			const token = createValidToken(testUser.id)

			const response = await app.request("/auth/authorize", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Authorization: `Bearer ${token}`,
				},
				body: new URLSearchParams({
					response_type: "code",
					client_id: testClient.id,
					redirect_uri: "https://example.com/callback",
					scope: "", // スコープが空
					state: "random-state-value-12345",
					nonce: "random-nonce-value-12345",
				}),
			})

			const data = await response.json()
			expect(response.status).toBe(400)
			expect(data).toEqual({
				error: "invalid_scope",
				state: "random-state-value-12345",
			})
		})

		it("400 Bad Request - スコープが未定義", async () => {
			const testUser = await createTestUser({
				user_name: "no_scope_user",
				first_name: "No",
				last_name: "Scope",
				email: "no_scope@example.com",
			})

			const testClient = await createTestOAuthClient({
				name: "no_scope_cli",
				secret: "test_secret_12345",
				redirect_uris: "https://example.com/callback",
				scopes: "openid,profile,email,address,phone",
			})

			const token = createValidToken(testUser.id)

			const response = await app.request("/auth/authorize", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Authorization: `Bearer ${token}`,
				},
				body: new URLSearchParams({
					response_type: "code",
					client_id: testClient.id,
					redirect_uri: "https://example.com/callback",
					// スコープパラメータがない
					state: "random-state-value-12345",
					nonce: "random-nonce-value-12345",
				}),
			})
			const data = await response.json()
			expect(response.status).toBe(400)
			// Zodの検証エラーはOAuth検証よりも前に来る
			expect(data.success).toBe(false)
		})

		it("400 Bad Request - OAuthクライアントに未登録のスコープを要求", async () => {
			const testUser = await createTestUser({
				user_name: "invalid_scope_user",
				first_name: "Invalid",
				last_name: "Scope",
				email: "invalid_scope@example.com",
			})

			const testClient = await createTestOAuthClient({
				name: "inv_scope",
				secret: "test_secret_12345",
				redirect_uris: "https://example.com/callback",
				scopes: "openid,profile", // emailスコープは登録されていない
			})

			const token = createValidToken(testUser.id)

			const response = await app.request("/auth/authorize", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Authorization: `Bearer ${token}`,
				},
				body: new URLSearchParams({
					response_type: "code",
					client_id: testClient.id,
					redirect_uri: "https://example.com/callback",
					scope: "openid profile email", // emailスコープは登録されていない
					state: "random-state-value-12345",
					nonce: "random-nonce-value-12345",
				}),
			})

			const data = await response.json()
			expect(response.status).toBe(400)
			expect(data).toEqual({
				error: "invalid_scope",
				state: "random-state-value-12345",
			})
		})

		it("400 Bad Request - 未認識のスコープ値を要求", async () => {
			const testUser = await createTestUser({
				user_name: "unrecognized_scope_user",
				first_name: "Unrecognized",
				last_name: "Scope",
				email: "unrecognized_scope@example.com",
			})

			const testClient = await createTestOAuthClient({
				name: "unrec_scope",
				secret: "test_secret_12345",
				redirect_uris: "https://example.com/callback",
				scopes: "openid,profile,email",
			})

			const token = createValidToken(testUser.id)

			const response = await app.request("/auth/authorize", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Authorization: `Bearer ${token}`,
				},
				body: new URLSearchParams({
					response_type: "code",
					client_id: testClient.id,
					redirect_uri: "https://example.com/callback",
					scope: "openid profile unknown_scope", // unknown_scopeは未認識
					state: "random-state-value-12345",
					nonce: "random-nonce-value-12345",
				}),
			})

			const data = await response.json()
			expect(response.status).toBe(400)
			expect(data).toEqual({
				error: "invalid_scope",
				state: "random-state-value-12345",
			})
		})
	})
})
