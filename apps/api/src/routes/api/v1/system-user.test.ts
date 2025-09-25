import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { app } from "../../.."
import type { SystemUser } from "../../../schema/system-user"
import { createValidToken } from "../../../test/utils/auth"
import { cleanupTestData, createTestUser } from "../../../test/utils/common"

describe("System User Tests", () => {
	beforeAll(async () => {
		// Clean up any existing test data
		await cleanupTestData()
	})

	afterAll(async () => {
		// Clean up test data after tests
		await cleanupTestData()
	})

	describe("GET /api/system-users", () => {
		it("should fetch system user list successfully", async () => {
			// Create a test user with profile and access control
			const testUser = await createTestUser({
				user_name: "system_user_test",
				first_name: "System",
				last_name: "UserTest",
				email: "system_user_test@example.com",
			})

			const token = createValidToken(testUser.id)
			const response = await app.request("/api/system-users", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})
			expect(response.status).toBe(200)
			const data = await response.json()
			expect(Array.isArray(data)).toBe(true)
			expect(data.length).toBeGreaterThan(0)
			const testUserInResponse = data.find(
				(user: SystemUser) => user.id === testUser.id,
			)
			expect(testUserInResponse).toBeTruthy()
			expect(testUserInResponse.id).toBe(testUser.id)
			expect(testUserInResponse.user_name).toBe("test_system_user_test")
			expect(testUserInResponse.first_name).toBe("System")
			expect(testUserInResponse.last_name).toBe("UserTest")
			expect(testUserInResponse.email).toBe("system_user_test@example.com")
			expect(testUserInResponse).toHaveProperty("profile_name")
			expect(testUserInResponse).toHaveProperty("timezone")
			expect(testUserInResponse).toHaveProperty("locale")
			expect(testUserInResponse).toHaveProperty("role_name")
			expect(testUserInResponse).toHaveProperty("is_active")
			expect(testUserInResponse).toHaveProperty("created_at")
			expect(testUserInResponse).toHaveProperty("modified_at")
		})
	})
})
