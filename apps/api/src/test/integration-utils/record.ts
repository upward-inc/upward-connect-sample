import { testPrisma } from "../integration-setup"

/**
 * Create a test account for integration tests
 */
export async function createIntegrationTestAccount(
	accountData: {
		name: string
	},
	userId: string,
) {
	const userReference = (userId: string) =>
		JSON.stringify({ entity: "user", id: userId })
	const account = await testPrisma.account.create({
		data: {
			name: accountData.name,
			owner: userReference(userId),
			created_by: userReference(userId),
			modified_by: userReference(userId),
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
	const userReference = (userId: string) =>
		JSON.stringify({ entity: "user", id: userId })
	const lead = await testPrisma.lead.create({
		data: {
			company: leadData.company,
			first_name: leadData.first_name,
			last_name: leadData.last_name,
			status: JSON.stringify([leadData.status]),
			owner: userReference(userId),
			created_by: userReference(userId),
			modified_by: userReference(userId),
		},
		select: {
			id: true,
		},
	})

	return lead
}
