import { testPrisma } from "../integration-setup"

const COMMON_FIELD_VALUES = (userId: string) => {
	return {
		owner: JSON.stringify({
			entity: "user",
			id: userId,
		}),
		created_by: JSON.stringify({
			entity: "user",
			id: userId,
		}),
		modified_by: JSON.stringify({
			entity: "user",
			id: userId,
		}),
	}
}

/**
 * Create a test account for integration tests
 */
export async function createIntegrationTestAccount(
	accountData: {
		name: string
	},
	userId: string,
) {
	const account = await testPrisma.account.create({
		data: {
			name: accountData.name,
			...COMMON_FIELD_VALUES(userId),
		},
		select: {
			id: true,
		},
	})

	return account
}

/**
 * Create a test lead for integration tests
 */
export async function createIntegrationTestLead(
	leadData: {
		company: string
		first_name: string
		last_name: string
		status: "new" | "contacted" | "nurturing" | "qualified" | "unqualified"
	},
	userId: string,
) {
	const lead = await testPrisma.lead.create({
		data: {
			company: leadData.company,
			first_name: leadData.first_name,
			last_name: leadData.last_name,
			status: JSON.stringify([leadData.status]),
			...COMMON_FIELD_VALUES(userId),
		},
		select: {
			id: true,
		},
	})

	return lead
}
