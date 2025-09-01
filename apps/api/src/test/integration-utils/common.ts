import { testPrisma } from "../integration-setup"

/**
 * Clean up all test data from the database
 */
export async function cleanupTestData() {
	try {
		// Clean up in reverse order of dependencies

		// Clean up files created by test users
		await testPrisma.file.deleteMany({
			where: {
				created_by: {
					in: await testPrisma.user
						.findMany({
							where: {
								user_name: {
									contains: "test_",
								},
							},
							select: {
								id: true,
							},
						})
						.then((users) => users.map((u) => u.id)),
				},
			},
		})

		await testPrisma.user_access_control.deleteMany({
			where: {
				user_user_access_control_user_idTouser: {
					user_name: {
						contains: "test_",
					},
				},
			},
		})

		await testPrisma.oauth_client.deleteMany({
			where: {
				name: {
					contains: "test_",
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
	} catch (error) {
		console.error("Error during cleanup:", error)
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

		return user
	} catch (error) {
		console.error("Error creating test user:", error)
		throw error
	}
}
