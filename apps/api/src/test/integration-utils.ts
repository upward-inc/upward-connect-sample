import { sign } from "jsonwebtoken"
import type * as ms from "ms"
import { testPrisma } from "./integration-setup"

/**
 * Clean up all test data from the database
 */
export async function cleanupTestData() {
	try {
		// Clean up in reverse order of dependencies
		await testPrisma.user_access_control.deleteMany({
			where: {
				user_user_access_control_user_idTouser: {
					user_name: {
						contains: "test_",
					},
				},
			},
		})

		await testPrisma.user.deleteMany({
			where: {
				user_name: {
					contains: "test_",
				},
			},
		})

		console.log("🧹 Test data cleanup completed")
	} catch (error) {
		console.error("❌ Error during cleanup:", error)
		throw error
	}
}

/**
 * Create a test user for integration tests
 */
export async function createIntegrationTestUser(userData: {
	user_name: string
	first_name: string
	last_name: string
	email: string | null
}) {
	try {
		const user = await testPrisma.user.create({
			data: {
				user_name: `test_${userData.user_name}`,
				first_name: userData.first_name,
				last_name: userData.last_name,
				email: userData.email,
				hashed_password: "test-password-123", // Use a fixed password for testing purposes
				is_active: true,
				timezone: "Asia/Tokyo",
				language: "ja",
			},
			select: {
				id: true,
				user_name: true,
				first_name: true,
				last_name: true,
				email: true,
				is_active: true,
			},
		})

		console.log(`✅ Created test user: ${user.user_name}`)
		return user
	} catch (error) {
		console.error("❌ Error creating test user:", error)
		throw error
	}
}

function createToken(userId: string, expiresIn?: ms.StringValue) {
	const secret = process.env.OIDC_TOKEN_SECRET
	if (!secret) {
		throw new Error("OIDC_TOKEN_SECRET environment variable is not set")
	}
	const issuer = process.env.OIDC_ISSUER
	const audience = process.env.OIDC_AUDIENCE

	return sign({}, secret, {
		algorithm: "HS256",
		issuer,
		subject: userId,
		audience,
		expiresIn: expiresIn || "1h", // Default to 1 hour if not provided
	})
}

export function createValidToken(userId: string) {
	return createToken(userId, "1h")
}

export function createExpiredToken(userId: string) {
	return createToken(userId, "-1h")
}
