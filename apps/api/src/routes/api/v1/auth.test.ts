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
		nonce?: string
		username?: string
		preferred_username?: string
		given_name?: string
		family_name?: string
		email?: string
		email_verified?: string
		name?: string
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
				audience: process.env.OIDC_AUDIENCE,
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
				audience: process.env.OIDC_AUDIENCE,
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
				audience: process.env.OIDC_AUDIENCE,
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
				scopes: "openid,profile,email",
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
				scopes: "openid,profile,email",
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
				scopes: "openid,profile,email",
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
				scopes: "openid,profile,email",
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
				scopes: "openid,profile,email",
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
				scopes: "openid,profile,email",
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
			expect(firstTokenData).toHaveProperty("refresh_token")

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
		it("should return code for valid authorization request", async () => {
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
				}),
			})

			const data = await response.json()
			expect(response.status).toBe(200)
			expect(data).toHaveProperty("code")
		})

		it("should return state parameter when state parameter is provided", async () => {
			// Create a test user and client
			const testUser = await createTestUser({
				user_name: "state_user",
				first_name: "State",
				last_name: "User",
				email: "state_user@example.com",
			})

			const testClient = await createTestOAuthClient({
				name: "state_cli",
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
				}),
			})

			const data = await response.json()
			expect(response.status).toBe(200)
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
			expect(tokenData).toHaveProperty("refresh_token")
			expect(tokenData).toHaveProperty("token_type", "Bearer")

			// Step 3: Verify nonce is included in ID token
			const decodedIdToken = verify(
				tokenData.id_token,
				tokenSecret,
			) as DecodedIdToken
			expect(decodedIdToken.nonce).toBe(nonceValue)
			expect(decodedIdToken.username).toBe(testUser.user_name)
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
	})
})
