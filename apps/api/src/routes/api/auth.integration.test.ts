import { randomUUID } from "node:crypto"
import { testClient } from "hono/testing"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { app } from "../../index"
import {
	cleanupTestData,
	createExpiredToken,
	createIntegrationTestUser,
	createValidToken,
} from "../../test/integration-utils"

describe("Auth Integration Tests", () => {
	beforeAll(async () => {
		// Clean up any existing test data
		await cleanupTestData()
		console.log("🧪 Starting OIDC authentication integration tests")
	})

	afterAll(async () => {
		// Clean up all test data
		await cleanupTestData()
		console.log("🧹 Integration test cleanup completed")
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

			const data = JSON.parse(await response.text())
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

			const data = JSON.parse(await response.text())
			expect(response.status).toBe(400)
			expect(data).toEqual({
				message: "Invalid authentication header",
			})
		})

		it("should return 401 for missing authorization header", async () => {
			const response = await app.request("/api/oauth2/userinfo", {
				method: "GET",
			})

			const data = JSON.parse(await response.text())
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

			const data = JSON.parse(await response.text())
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

			const data = JSON.parse(await response.text())
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

			const data = JSON.parse(await response.text())
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

			const data = JSON.parse(await response.text())
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

			const data = JSON.parse(await response.text())
			expect(response.status).toBe(401)
			expect(data).toEqual({
				message: "Invalid token",
			})
		})

		it("should return 404 for non-existent user", async () => {
			const nonExistentUserId = randomUUID()
			const token = createValidToken(nonExistentUserId)
			const response = await app.request("/api/oauth2/userinfo", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})

			const data = JSON.parse(await response.text())
			expect(response.status).toBe(404)
			expect(data).toEqual({
				error: "User not found",
				error_description:
					"The user associated with the provided token does not exist.",
			})
		})
	})
})
