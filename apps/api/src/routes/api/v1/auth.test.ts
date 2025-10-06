import { type JwtPayload, sign, verify } from "jsonwebtoken"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { env } from "../../../env"
import { app } from "../../../index"
import {
	createExpiredRefreshToken,
	createExpiredToken,
	createRefreshToken,
	createTestOAuthClient,
	createValidToken,
} from "../../../test/utils/auth"
import { cleanupTestData, createTestUser } from "../../../test/utils/common"

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
			})
			const token = createValidToken(testUser.id)
			const response = await app.request("/api/v1/oauth2/userinfo", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})

			const data = await response.json()
			expect(response.status).toBe(200)
			expect(data).toEqual({
				sub: testUser.id,
				name: `${testUser.last_name} ${testUser.first_name}`,
				given_name: testUser.first_name,
				family_name: testUser.last_name,
				email: testUser.email,
			})
		})

		it("should return 400 for invalid authorization header format", async () => {
			const response = await app.request("/api/v1/oauth2/userinfo", {
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
			const response = await app.request("/api/v1/oauth2/userinfo", {
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

			const response = await app.request("/api/v1/oauth2/userinfo", {
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
			const response = await app.request("/api/v1/oauth2/userinfo", {
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

			const response = await app.request("/api/v1/oauth2/userinfo", {
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

			const response = await app.request("/api/v1/oauth2/userinfo", {
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

			const response = await app.request("/api/v1/oauth2/userinfo", {
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

		it("should return 404 for non-existent user", async () => {
			const nonExistentUserId = crypto.randomUUID()
			const token = createValidToken(nonExistentUserId)
			const response = await app.request("/api/v1/oauth2/userinfo", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})

			const data = await response.json()
			expect(response.status).toBe(404)
			expect(data).toEqual({
				error: "User not found",
				error_description:
					"The user associated with the provided token does not exist.",
			})
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

			const response = await app.request("/api/v1/oauth2/token", {
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

			const response = await app.request("/api/v1/oauth2/token", {
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

			const response = await app.request("/api/v1/oauth2/token", {
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

			const response = await app.request("/api/v1/oauth2/token", {
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

			const response = await app.request("/api/v1/oauth2/token", {
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

			const response = await app.request("/api/v1/oauth2/token", {
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

			const response = await app.request("/api/v1/oauth2/token", {
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
			// Zod validation error for unsupported grant type
			expect(data.success).toBe(false)
			expect(data.error).toHaveProperty("issues")
			expect(data.error.issues[0].path).toContainEqual("grant_type")
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

			const response = await app.request("/api/v1/oauth2/token", {
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
			const authorizeResponse = await app.request("/api/v1/oauth2/authorize", {
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
				}),
			})

			const authorizeData = await authorizeResponse.json()
			expect(authorizeResponse.status).toBe(200)
			expect(authorizeData).toHaveProperty("code")

			// Step 2: Exchange authorization code for tokens (first time - should succeed)
			const firstTokenResponse = await app.request("/api/v1/oauth2/token", {
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

			const firstTokenData = await firstTokenResponse.json()
			expect(firstTokenResponse.status).toBe(200)
			expect(firstTokenData).toHaveProperty("access_token")
			expect(firstTokenData).toHaveProperty("id_token")
			expect(firstTokenData).not.toHaveProperty("refresh_token")

			// Step 3: Try to reuse the same authorization code (should fail)
			const secondTokenResponse = await app.request("/api/v1/oauth2/token", {
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
			const authorizeResponse = await app.request("/api/v1/oauth2/authorize", {
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
				}),
			})

			const authorizeData = await authorizeResponse.json()
			expect(authorizeResponse.status).toBe(200)
			expect(authorizeData).toHaveProperty("code")

			// Step 2: Try to exchange with INVALID client_secret (should fail but code should be invalidated)
			const invalidSecretResponse = await app.request("/api/v1/oauth2/token", {
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
				}),
			})

			const invalidSecretData = await invalidSecretResponse.json()
			expect(invalidSecretResponse.status).toBe(400)
			expect(invalidSecretData).toEqual({
				error: "invalid_grant",
				error_description: "Invalid client_secret",
			})

			// Step 3: Try to exchange with VALID parameters (should fail because code was already invalidated)
			const validParamsResponse = await app.request("/api/v1/oauth2/token", {
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
				}),
			})

			const validParamsData = await validParamsResponse.json()
			expect(validParamsResponse.status).toBe(400)
			expect(validParamsData).toEqual({
				error: "invalid_grant",
				error_description: "Invalid authorization code",
			})
		})
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

			const response = await app.request("/api/v1/oauth2/authorize", {
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

			const response = await app.request("/api/v1/oauth2/authorize", {
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
				error: "invalid_request",
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

			const response = await app.request("/api/v1/oauth2/authorize", {
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
				error: "invalid_request",
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

			const response = await app.request("/api/v1/oauth2/authorize", {
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
			expect(data.error).toHaveProperty("issues")
			expect(data.error.issues[0].path).toContainEqual("response_type")
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
			const authorizeResponse = await app.request("/api/v1/oauth2/authorize", {
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
			const tokenResponse = await app.request("/api/v1/oauth2/token", {
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
			const authorizeResponse = await app.request("/api/v1/oauth2/authorize", {
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
			const tokenResponse = await app.request("/api/v1/oauth2/token", {
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
			const authorizeResponse = await app.request("/api/v1/oauth2/authorize", {
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
			const tokenResponse = await app.request("/api/v1/oauth2/token", {
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
			const authorizeResponse = await app.request("/api/v1/oauth2/authorize", {
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
			const tokenResponse = await app.request("/api/v1/oauth2/token", {
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
			const authorizeResponse = await app.request("/api/v1/oauth2/authorize", {
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
			const tokenResponse = await app.request("/api/v1/oauth2/token", {
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

			const response = await app.request("/api/v1/oauth2/authorize", {
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
				error: "invalid_request",
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

			const response = await app.request("/api/v1/oauth2/authorize", {
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
			expect(data.error).toHaveProperty("issues")
			expect(data.error.issues[0].path).toContainEqual("scope")
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

			const response = await app.request("/api/v1/oauth2/authorize", {
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
				error: "invalid_request",
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

			const response = await app.request("/api/v1/oauth2/authorize", {
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
				error: "invalid_request",
				state: "random-state-value-12345",
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
			const authorizeResponse = await app.request("/api/v1/oauth2/authorize", {
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
				}),
			})

			const authorizeData = await authorizeResponse.json()
			expect(authorizeResponse.status).toBe(200)
			expect(authorizeData).toHaveProperty("code")

			// Step 2: Exchange authorization code for tokens
			const tokenResponse = await app.request("/api/v1/oauth2/token", {
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
			expect(tokenData).toHaveProperty("id_token")

			// Step 3: Verify aud claim in ID token equals client_id
			const decodedIdToken = verify(
				tokenData.id_token,
				tokenSecret,
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
			const authorizeResponse = await app.request("/api/v1/oauth2/authorize", {
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
				}),
			})

			const authorizeData = await authorizeResponse.json()
			expect(authorizeResponse.status).toBe(200)
			expect(authorizeData).toHaveProperty("code")

			// Step 2: Exchange authorization code for tokens
			const tokenResponse = await app.request("/api/v1/oauth2/token", {
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
			const authorizeResponse = await app.request("/api/v1/oauth2/authorize", {
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
				}),
			})

			const authorizeData = await authorizeResponse.json()
			expect(authorizeResponse.status).toBe(200)

			const tokenResponse = await app.request("/api/v1/oauth2/token", {
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

			// Step 2: Use refresh token to get new access token
			const refreshResponse = await app.request("/api/v1/oauth2/token", {
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
			const response = await app.request("/api/v1/oauth2/login", {
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
			const authorizeResponse = await app.request("/api/v1/oauth2/authorize", {
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
				}),
			})

			const authorizeData = await authorizeResponse.json()
			expect(authorizeResponse.status).toBe(200)
			expect(authorizeData).toHaveProperty("code")

			// ステップ2: 認可コードをトークンに交換
			const tokenResponse = await app.request("/api/v1/oauth2/token", {
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
			expect(tokenData).toHaveProperty("id_token")

			// ステップ3: IDトークンの検証
			const decodedIdToken = verify(
				tokenData.id_token,
				tokenSecret,
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
			const authorizeResponse = await app.request("/api/v1/oauth2/authorize", {
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
				}),
			})

			const authorizeData = await authorizeResponse.json()
			expect(authorizeResponse.status).toBe(200)
			expect(authorizeData).toHaveProperty("code")

			// ステップ2: 認可コードをトークンに交換
			const tokenResponse = await app.request("/api/v1/oauth2/token", {
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
			expect(tokenData).toHaveProperty("id_token")

			// ステップ3: IDトークンの検証
			const decodedIdToken = verify(
				tokenData.id_token,
				tokenSecret,
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
