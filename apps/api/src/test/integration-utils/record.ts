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
	account_number?: string
	main_phone_number?: string
	website?: string
	industry?: string
	number_of_employees?: number
}) {
	const account = await testPrisma.account.create({
		data: {
			name: `test_${accountData.name}`,
			account_number: accountData.account_number ?? null,
			main_phone_number: accountData.main_phone_number ?? null,
			website: accountData.website ?? null,
			industry: accountData.industry
				? JSON.stringify([accountData.industry])
				: null,
			number_of_employees: accountData.number_of_employees ?? null,
			owner: testUserReference,
			created_by: testUserReference,
			modified_by: testUserReference,
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
export async function createIntegrationTestLead(leadData: {
	company: string
	first_name: string
	last_name: string
	status: "new" | "contacted" | "nurturing" | "qualified" | "unqualified"
}) {
	const lead = await testPrisma.lead.create({
		data: {
			company: `test_${leadData.company}`,
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
}

/**
 * Create a test activity for integration tests
 */
export async function createIntegrationTestActivity(activityData: {
	subject: string
	is_all_day_event: boolean
	is_archived: boolean
}) {
	const activity = await testPrisma.activity.create({
		data: {
			subject: `test_${activityData.subject}`,
			is_all_day_event: activityData.is_all_day_event,
			is_archived: activityData.is_archived,
			owner: testUserReference,
			created_by: testUserReference,
			modified_by: testUserReference,
		},
		select: {
			id: true,
		},
	})

	return activity
}

/**
 * Create a test phone call for integration tests
 */
export async function createIntegrationTestPhoneCall(phoneCallData: {
	subject: string
	user: { entity: string; id: string }
	their: { entity: string; id: string }
	direction: "inbound" | "outbound"
}) {
	const phoneCall = await testPrisma.phone_call.create({
		data: {
			subject: `test_${phoneCallData.subject}`,
			user: JSON.stringify(phoneCallData.user),
			their: JSON.stringify(phoneCallData.their),
			direction: JSON.stringify([phoneCallData.direction]),
			status: JSON.stringify(["connected"]), // Add status field to avoid null/undefined issues
			owner: testUserReference,
			created_by: testUserReference,
			modified_by: testUserReference,
		},
		select: {
			id: true,
		},
	})

	return phoneCall
}

/**
 * Create a test contact for integration tests
 */
export async function createIntegrationTestContact(contactData: {
	last_name: string
}) {
	const contact = await testPrisma.contact.create({
		data: {
			last_name: `test_${contactData.last_name}`,
			owner: testUserReference,
			created_by: testUserReference,
			modified_by: testUserReference,
		},
		select: {
			id: true,
		},
	})

	return contact
}

/**
 * Create a test opportunity for integration tests
 */
export async function createIntegrationTestOpportunity(opportunityData: {
	name: string
	account: string
	phase:
		| "contact"
		| "evaluation"
		| "need_assessment"
		| "proposal"
		| "budget_confirmation"
		| "price_negotiation"
		| "proposal_creation"
		| "final_negotiation"
		| "deal_won"
		| "deal_lost"
	close_date: Date
	is_closed: boolean
}) {
	const opportunity = await testPrisma.opportunity.create({
		data: {
			name: `test_${opportunityData.name}`,
			account: JSON.stringify({
				entity: "account",
				id: opportunityData.account,
			}),
			phase: JSON.stringify([opportunityData.phase]),
			close_date: opportunityData.close_date,
			is_closed: opportunityData.is_closed,
			owner: testUserReference,
			created_by: testUserReference,
			modified_by: testUserReference,
		},
		select: {
			id: true,
		},
	})

	return opportunity
}

/**
 * Create a test case for integration tests
 */
export async function createIntegrationTestCase(caseData: {
	case_number: string
	subject: string
}) {
	const testCase = await testPrisma.renamedcase.create({
		data: {
			case_number: `test_${caseData.case_number}`,
			subject: `test_${caseData.subject}`,
			owner: testUserReference,
			created_by: testUserReference,
			modified_by: testUserReference,
		},
		select: {
			id: true,
		},
	})

	return testCase
}

/**
 * Create a test product for integration tests
 */
export async function createIntegrationTestProduct(productData: {
	name: string
}) {
	const product = await testPrisma.product.create({
		data: {
			name: `test_${productData.name}`,
			owner: testUserReference,
			created_by: testUserReference,
			modified_by: testUserReference,
		},
		select: {
			id: true,
		},
	})

	return product
}

/**
 * Create a test campaign for integration tests
 */
export async function createIntegrationTestCampaign(campaignData: {
	name: string
}) {
	const campaign = await testPrisma.campaign.create({
		data: {
			name: `test_${campaignData.name}`,
			owner: testUserReference,
			created_by: testUserReference,
			modified_by: testUserReference,
		},
		select: {
			id: true,
		},
	})

	return campaign
}

/**
 * Create a test sample for integration tests
 */
export async function createIntegrationTestSample(sampleData: {
	name: string
}) {
	const sample = await testPrisma.sample.create({
		data: {
			name: `test_${sampleData.name}`,
			owner: testUserReference,
			created_by: testUserReference,
			modified_by: testUserReference,
		},
		select: {
			id: true,
		},
	})

	return sample
}
