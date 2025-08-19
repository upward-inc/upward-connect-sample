import { type JwtPayload, sign, verify } from "jsonwebtoken"
import { afterAll, beforeAll, describe, expect, it, test } from "vitest"
import { env } from "../../env"
import { app } from "../../index"
import {
	createExpiredRefreshToken,
	createExpiredToken,
	createIntegrationTestOAuthClient,
	createRefreshToken,
	createValidToken,
} from "../../test/integration-utils/auth"
import {
	cleanupTestData,
	createIntegrationTestUser,
} from "../../test/integration-utils/common"

describe("Auth Integration Tests", () => {
	const tokenSecret = process.env.OIDC_TOKEN_SECRET as string
	interface DecodedIdToken extends JwtPayload {
		nonce?: string
		username?: string
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
			const testUser = await createIntegrationTestUser({
				user_name: "test_user",
				first_name: "Test",
				last_name: "User",
				email: "test_user@example.com",
			})
			const token = createValidToken(testUser.id)
			const response = await app.request("/api/oauth2/userinfo", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})

			const data = await response.json()
			expect(response.status).toBe(200)
			expect(data).toEqual({
				sub: testUser.id,
				name: testUser.user_name,
				given_name: testUser.first_name,
				family_name: testUser.last_name,
				email: testUser.email,
			})
		})

		it("should return 400 for invalid authorization header format", async () => {
			const response = await app.request("/api/oauth2/userinfo", {
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
			const response = await app.request("/api/oauth2/userinfo", {
				method: "GET",
			})

			const data = await response.json()
			expect(response.status).toBe(401)
			expect(data).toEqual({
				message: "No authentication header",
			})
		})

		it("should return 401 for expired token", async () => {
			const testUser = await createIntegrationTestUser({
				user_name: "expired_user",
				first_name: "Expired",
				last_name: "User",
				email: "expired_user@example.com",
			})
			const expiredToken = createExpiredToken(testUser.id)

			const response = await app.request("/api/oauth2/userinfo", {
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
			const response = await app.request("/api/oauth2/userinfo", {
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
			const testUser = await createIntegrationTestUser({
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

			const response = await app.request("/api/oauth2/userinfo", {
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

			const response = await app.request("/api/oauth2/userinfo", {
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

			const response = await app.request("/api/oauth2/userinfo", {
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
			const response = await app.request("/api/oauth2/userinfo", {
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
			const testUser = await createIntegrationTestUser({
				user_name: "refresh_user",
				first_name: "Refresh",
				last_name: "User",
				email: "refresh_user@example.com",
			})

			// Create a test OAuth client
			const testClient = await createIntegrationTestOAuthClient({
				name: "refresh_cli",
				secret: "test_secret_12345",
				redirect_uris: "https://localhost:3000/callback",
				scopes: "openid,profile,email",
			})

			// Create a refresh token
			const refreshToken = createRefreshToken(testUser.id)

			const response = await app.request("/api/oauth2/token", {
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
			expect(data).not.toHaveProperty("id_token")
			expect(data).toHaveProperty("token_type", "Bearer")
			expect(data).toHaveProperty(
				"expires_in",
				env.OIDC_TOKEN_EXPIRES_IN_MINUTE * 60,
			) // Default expiration time in seconds
		})

		it("should return 400 for invalid client_id", async () => {
			const testUser = await createIntegrationTestUser({
				user_name: "refresh_user_invalid_client",
				first_name: "Refresh",
				last_name: "User",
				email: "refresh_user_invalid_client@example.com",
			})

			const refreshToken = createRefreshToken(testUser.id)
			const nonExistentClientId = crypto.randomUUID()

			const response = await app.request("/api/oauth2/token", {
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
			const testUser = await createIntegrationTestUser({
				user_name: "refresh_user_invalid_secret",
				first_name: "Refresh",
				last_name: "User",
				email: "refresh_user_invalid_secret@example.com",
			})

			const testClient = await createIntegrationTestOAuthClient({
				name: "inv_secret",
				secret: "test_secret_12345",
				redirect_uris: "https://localhost:3000/callback",
				scopes: "openid,profile,email",
			})

			const refreshToken = createRefreshToken(testUser.id)

			const response = await app.request("/api/oauth2/token", {
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
			const testUser = await createIntegrationTestUser({
				user_name: "refresh_user_expired",
				first_name: "Refresh",
				last_name: "User",
				email: "refresh_user_expired@example.com",
			})

			const testClient = await createIntegrationTestOAuthClient({
				name: "exp_token",
				secret: "test_secret_12345",
				redirect_uris: "https://localhost:3000/callback",
				scopes: "openid,profile,email",
			})

			const expiredRefreshToken = createExpiredRefreshToken(testUser.id)

			const response = await app.request("/api/oauth2/token", {
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
			const testClient = await createIntegrationTestOAuthClient({
				name: "malformed",
				secret: "test_secret_12345",
				redirect_uris: "https://localhost:3000/callback",
				scopes: "openid,profile,email",
			})

			const response = await app.request("/api/oauth2/token", {
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
			const testClient = await createIntegrationTestOAuthClient({
				name: "unknown_user",
				secret: "test_secret_12345",
				redirect_uris: "https://localhost:3000/callback",
				scopes: "openid,profile,email",
			})

			const nonExistentUserId = crypto.randomUUID()
			const refreshToken = createRefreshToken(nonExistentUserId)

			const response = await app.request("/api/oauth2/token", {
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
			const testClient = await createIntegrationTestOAuthClient({
				name: "unsupported",
				secret: "test_secret_12345",
				redirect_uris: "https://localhost:3000/callback",
				scopes: "openid,profile,email",
			})

			const response = await app.request("/api/oauth2/token", {
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

	describe("Authorize Endpoint - State Validation", () => {
		it("should preserve state parameter in successful authorization", async () => {
			// Create a test user and client
			const testUser = await createIntegrationTestUser({
				user_name: "state_user",
				first_name: "State",
				last_name: "User",
				email: "state_user@example.com",
			})

			const testClient = await createIntegrationTestOAuthClient({
				name: "state_cli",
				secret: "test_secret_12345",
				redirect_uris: "https://example.com/callback",
				scopes: "openid,profile,email",
			})

			const stateValue = "random-state-value-12345"
			const token = createValidToken(testUser.id)

			const response = await app.request("/api/oauth2/authorize", {
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
			expect(data).toHaveProperty("code")
			expect(data).toHaveProperty("state", stateValue)
		})

		it("should return null state when state parameter is not provided", async () => {
			// Create a test user and client
			const testUser = await createIntegrationTestUser({
				user_name: "no_state_user",
				first_name: "No",
				last_name: "State",
				email: "no_state@example.com",
			})

			const testClient = await createIntegrationTestOAuthClient({
				name: "no_state",
				secret: "test_secret_12345",
				redirect_uris: "https://example.com/callback",
				scopes: "openid,profile,email",
			})

			const token = createValidToken(testUser.id)

			const response = await app.request("/api/oauth2/authorize", {
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
			expect(data).toHaveProperty("state", null)
		})

		it("should preserve state parameter in error responses - invalid client_id", async () => {
			const testUser = await createIntegrationTestUser({
				user_name: "invalid_client_user",
				first_name: "Invalid",
				last_name: "Client",
				email: "invalid_client@example.com",
			})

			const stateValue = "state-for-error-test"
			const token = createValidToken(testUser.id)

			const response = await app.request("/api/oauth2/authorize", {
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

		it("should preserve state parameter in error responses - invalid redirect_uri", async () => {
			const testUser = await createIntegrationTestUser({
				user_name: "invalid_redirect_user",
				first_name: "Invalid",
				last_name: "Redirect",
				email: "invalid_redirect@example.com",
			})

			const testClient = await createIntegrationTestOAuthClient({
				name: "inv_red",
				secret: "test_secret_12345",
				redirect_uris: "https://example.com/callback",
				scopes: "openid,profile,email",
			})

			const stateValue = "state-for-redirect-error"
			const token = createValidToken(testUser.id)

			const response = await app.request("/api/oauth2/authorize", {
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

		it("should preserve state parameter in error responses - invalid response_type", async () => {
			const testUser = await createIntegrationTestUser({
				user_name: "invalid_response_type_user",
				first_name: "Invalid",
				last_name: "ResponseType",
				email: "invalid_response_type@example.com",
			})

			const testClient = await createIntegrationTestOAuthClient({
				name: "inv_resp",
				secret: "test_secret_12345",
				redirect_uris: "https://example.com/callback",
				scopes: "openid,profile,email",
			})

			const stateValue = "state-for-response-type-error"
			const token = createValidToken(testUser.id)

			const response = await app.request("/api/oauth2/authorize", {
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
	})

	describe("Authorize Endpoint - Nonce Validation", () => {
		it("should preserve nonce parameter in authorization code and ID token", async () => {
			// Create a test user and client
			const testUser = await createIntegrationTestUser({
				user_name: "nonce_user",
				first_name: "Nonce",
				last_name: "User",
				email: "nonce_user@example.com",
			})

			const testClient = await createIntegrationTestOAuthClient({
				name: "nonce_cli",
				secret: "test_secret_12345",
				redirect_uris: "https://example.com/callback",
				scopes: "openid,profile,email",
			})

			const nonceValue = "random-nonce-value-12345"
			const stateValue = "state-value-12345"
			const token = createValidToken(testUser.id)

			// Step 1: Authorize with nonce
			const authorizeResponse = await app.request("/api/oauth2/authorize", {
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
					nonce: nonceValue,
				}),
			})

			const authorizeData = await authorizeResponse.json()
			expect(authorizeResponse.status).toBe(200)
			expect(authorizeData).toHaveProperty("code")
			expect(authorizeData).toHaveProperty("state", stateValue)

			// Step 2: Exchange authorization code for tokens
			const tokenResponse = await app.request("/api/oauth2/token", {
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

		it("should handle authorize request without nonce parameter", async () => {
			// Create a test user and client
			const testUser = await createIntegrationTestUser({
				user_name: "no_nonce_user",
				first_name: "No",
				last_name: "Nonce",
				email: "no_nonce@example.com",
			})

			const testClient = await createIntegrationTestOAuthClient({
				name: "no_nonce_cli",
				secret: "test_secret_12345",
				redirect_uris: "https://example.com/callback",
				scopes: "openid,profile,email",
			})

			const token = createValidToken(testUser.id)

			// Step 1: Authorize without nonce
			const authorizeResponse = await app.request("/api/oauth2/authorize", {
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

			// Step 2: Exchange authorization code for tokens
			const tokenResponse = await app.request("/api/oauth2/token", {
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

			// Step 3: Verify nonce is not included in ID token when not provided
			const decodedIdToken = verify(
				tokenData.id_token,
				tokenSecret,
			) as DecodedIdToken
			expect(decodedIdToken.nonce).toBeUndefined()
			expect(decodedIdToken.username).toBe(testUser.user_name)
			expect(decodedIdToken.sub).toBe(testUser.id)
		})

		it("should handle empty string as nonce parameter correctly", async () => {
			// Create a test user and client
			const testUser = await createIntegrationTestUser({
				user_name: "empty_nonce_user",
				first_name: "Empty",
				last_name: "Nonce",
				email: "empty_nonce@example.com",
			})

			const testClient = await createIntegrationTestOAuthClient({
				name: "empty_nonce_cli",
				secret: "test_secret_12345",
				redirect_uris: "https://example.com/callback",
				scopes: "openid,profile,email",
			})

			const token = createValidToken(testUser.id)

			// Authorize with empty nonce
			const authorizeResponse = await app.request("/api/oauth2/authorize", {
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
			const tokenResponse = await app.request("/api/oauth2/token", {
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
			const testUser = await createIntegrationTestUser({
				user_name: "special_nonce_user",
				first_name: "Special",
				last_name: "Nonce",
				email: "special_nonce@example.com",
			})

			const testClient = await createIntegrationTestOAuthClient({
				name: "sp_nonce",
				secret: "test_secret_12345",
				redirect_uris: "https://example.com/callback",
				scopes: "openid,profile,email",
			})

			// Create a nonce with special characters (URL-safe)
			const specialNonce = "nonce-123_ABC.xyz~!@#$%^&*()+=[]{}|;':\",./<>?"
			const token = createValidToken(testUser.id)

			// Authorize with special character nonce
			const authorizeResponse = await app.request("/api/oauth2/authorize", {
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
			const tokenResponse = await app.request("/api/oauth2/token", {
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

	describe("OIDC Token Audience (aud) Validation", () => {
		it("should set aud claim in id_token equal to client_id from request", async () => {
			// Create a test user and client
			const testUser = await createIntegrationTestUser({
				user_name: "aud_test_user",
				first_name: "Audience",
				last_name: "Test",
				email: "aud_test@example.com",
			})

			const testClient = await createIntegrationTestOAuthClient({
				name: "aud_cli",
				secret: "test_secret_12345",
				redirect_uris: "https://example.com/callback",
				scopes: "openid,profile,email",
			})

			const token = createValidToken(testUser.id)

			// Step 1: Authorize request
			const authorizeResponse = await app.request("/api/oauth2/authorize", {
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

			// Step 2: Exchange authorization code for tokens
			const tokenResponse = await app.request("/api/oauth2/token", {
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
			expect(decodedIdToken.username).toBe(testUser.user_name)
		})

		it("should set aud claim in access_token equal to client_id from request", async () => {
			// Create a test user and client
			const testUser = await createIntegrationTestUser({
				user_name: "aud_access_test_user",
				first_name: "Access",
				last_name: "Test",
				email: "aud_access_test@example.com",
			})

			const testClient = await createIntegrationTestOAuthClient({
				name: "aud_acc_cli",
				secret: "test_secret_67890",
				redirect_uris: "https://example.com/callback",
				scopes: "openid,profile,email",
			})

			const token = createValidToken(testUser.id)

			// Step 1: Authorize request
			const authorizeResponse = await app.request("/api/oauth2/authorize", {
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

			// Step 2: Exchange authorization code for tokens
			const tokenResponse = await app.request("/api/oauth2/token", {
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
			const testUser = await createIntegrationTestUser({
				user_name: "aud_refresh_test_user",
				first_name: "Refresh",
				last_name: "Test",
				email: "aud_refresh_test@example.com",
			})

			const testClient = await createIntegrationTestOAuthClient({
				name: "aud_ref_cli",
				secret: "test_secret_refresh_123",
				redirect_uris: "https://example.com/callback",
				scopes: "openid,profile,email",
			})

			const token = createValidToken(testUser.id)

			// Step 1: Get initial tokens through authorization code flow
			const authorizeResponse = await app.request("/api/oauth2/authorize", {
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

			const tokenResponse = await app.request("/api/oauth2/token", {
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
			const refreshResponse = await app.request("/api/oauth2/token", {
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
		test.skip("should set aud claim in access_token equal to default client_id for /login", async () => {
			// Create a test user
			const testUser = await createIntegrationTestUser({
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
			const response = await app.request("/api/oauth2/login", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					username: testUser.user_name,
					password: "test-password-123", // Use the actual password stored in createIntegrationTestUser
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
})
