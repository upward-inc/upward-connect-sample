import { afterAll, beforeAll, describe, expect, it } from "vitest"
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
			const { sign } = require("jsonwebtoken")
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
			const { sign } = require("jsonwebtoken")
			const noSubjectToken = sign({}, process.env.OIDC_TOKEN_SECRET, {
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
			const { sign } = require("jsonwebtoken")
			const emptySubjectToken = sign({}, process.env.OIDC_TOKEN_SECRET, {
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
			expect(data).toHaveProperty("id_token")
			expect(data).toHaveProperty("refresh_token")
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
})
