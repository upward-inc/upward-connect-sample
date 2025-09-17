import { testPrisma } from "../integration-setup"

const testUserReference = JSON.stringify({
	entity: "user",
	id: crypto.randomUUID(),
})

/**
 * Create a test account for integration tests
 */
export async function createIntegrationTestAccount(accountData: {
	name: string
}) {
	try {
		const account = await testPrisma.account.create({
			data: {
				name: accountData.name,
				owner: testUserReference,
				created_by: testUserReference,
				modified_by: testUserReference,
			},
			select: {
				id: true,
			},
		})

		return account
	} catch (error) {
		console.error("Error creating test account:", error)
		throw error
	}
}

/**
 * Create a test lead for integration tests
 */
export async function createIntegrationTestLead(leadData: {
	company: string
	first_name: string
	last_name: string
	status: "new" | "contacted" | "nurturing" | "qualified" | "unqualified"
}) {
	try {
		const lead = await testPrisma.lead.create({
			data: {
				company: leadData.company,
				first_name: leadData.first_name,
				last_name: leadData.last_name,
				status: JSON.stringify([leadData.status]),
				owner: testUserReference,
				created_by: testUserReference,
				modified_by: testUserReference,
			},
			select: {
				id: true,
			},
		})

		return lead
	} catch (error) {
		console.error("Error creating test lead:", error)
		throw error
	}
}
