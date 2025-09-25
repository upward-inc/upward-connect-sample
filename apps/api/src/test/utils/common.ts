import { testPrisma } from "../setup"

/**
 * Clean up all test data from the database
 */
export async function cleanupTestData() {
	// Clean up in reverse order of dependencies

	// Clean up published_auth_code first (references user)
	await testPrisma.published_auth_code.deleteMany({
		where: {
			user: {
				user_name: {
					contains: "test_",
				},
			},
		},
	})

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

	await testPrisma.profile.deleteMany({
		where: {
			name: {
				contains: "test_",
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

	// Clean up record data
	await testPrisma.lead.deleteMany({
		where: {
			company: {
				contains: "Test Company",
			},
		},
	})
	await testPrisma.account.deleteMany({
		where: {
			name: {
				contains: "Test Account",
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
}

let testProfile: { id: string }

/**
 * Create a test user for tests
 */
export async function createTestUser(userData: {
	user_name: string
	first_name: string
	last_name: string
	email: string | null
}) {
	const user = await testPrisma.user.create({
		data: {
			user_name: `test_${userData.user_name}`,
			first_name: userData.first_name,
			last_name: userData.last_name,
			email: userData.email,
			hashed_password: "test-password-123", // Use a fixed password for testing purposes
			is_active: true,
			timezone: "Asia/Tokyo",
			locale: "ja-JP",
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

	if (!testProfile) {
		testProfile = await createTestProfile(user.id)
	}

	// Create user access control to link user with profile
	await testPrisma.user_access_control.create({
		data: {
			user_id: user.id,
			profile_id: testProfile.id,
			created_by: user.id,
			modified_by: user.id,
		},
	})

	return user
}

async function createTestProfile(userId: string) {
	return await testPrisma.profile.create({
		data: {
			name: "test_profile",
			display_name: "Test Profile",
			order: 999,
			created_by: userId,
			modified_by: userId,
		},
	})
}
