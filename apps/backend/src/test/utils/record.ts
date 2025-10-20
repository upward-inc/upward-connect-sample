import type { Prisma } from "@prisma/client"
import { testPrisma } from "../setup"

export type Account = Awaited<
	ReturnType<typeof testPrisma.account_view.findUniqueOrThrow>
>
export interface AccountData
	extends Omit<
		Prisma.accountCreateInput,
		"originating_lead" | "parent" | "owner" | "created_by" | "modified_by"
	> {
	originating_lead?: RecordReference | null
	parent?: RecordReference | null
	owner?: RecordReference
	created_by?: RecordReference
	modified_by?: RecordReference
}

export type Lead = Awaited<
	ReturnType<typeof testPrisma.lead_view.findUniqueOrThrow>
>

export interface LeadData
	extends Omit<
		Prisma.leadCreateInput,
		"status" | "owner" | "created_by" | "modified_by"
	> {
	status?: string
	owner?: RecordReference
	created_by?: RecordReference
	modified_by?: RecordReference
}

export type Sample = Awaited<
	ReturnType<typeof testPrisma.sample_view.findUniqueOrThrow>
>

export interface SampleData
	extends Omit<
		Prisma.sampleCreateInput,
		| "option_multi"
		| "reference_single_target_single_id"
		| "reference_single_target_multi_id"
		| "reference_multi_target_single_id"
		| "reference_multi_target_multi_id"
		| "owner"
		| "created_by"
		| "modified_by"
	> {
	option_multi?: string[] | null
	reference_single_target_single_id?: RecordReference | null
	reference_single_target_multi_id?: RecordReference[] | null
	reference_multi_target_single_id?: RecordReference | null
	reference_multi_target_multi_id?: RecordReference[] | null
	owner?: RecordReference
	created_by?: RecordReference
	modified_by?: RecordReference
}

interface RecordReference {
	entity: string
	id: string
}

/**
 * 取引先テストデータの作成
 */
export async function createTestAccount(
	userId: string,
<<<<<<< HEAD:apps/backend/src/test/utils/record.ts
) {
	const userReference = JSON.stringify({ entity_name: "user", id: userId })
=======
	data: AccountData,
): Promise<Account> {
>>>>>>> f1675f3 (テストレコードデータ操作ユーティリティの作成):apps/api/src/test/utils/record.ts
	const account = await testPrisma.account.create({
		data: toAccountCreateInput(userId, data),
		select: { id: true },
	})

	return await testPrisma.account_view.findUniqueOrThrow({
		where: { id: account.id },
	})
}

/**
 * 取引先テストデータの一括作成
 */
export async function createManyTestAccounts(
	userId: string,
	data: Array<AccountData>,
): Promise<{ count: number }> {
	return await testPrisma.account.createMany({
		data: data.map((d) => toAccountCreateInput(userId, d)),
	})
}

/**
 * 取引先テストデータの全削除
 */
export async function deleteAllTestAccounts() {
	await testPrisma.account.deleteMany()
}

/**
 * 取引先テストデータの削除（レコードID指定）
 */
export async function deleteTestAccountById(id: string) {
	await testPrisma.account.delete({ where: { id } })
}

/**
 * 取引先テストデータの一括削除（Prefix指定）
 */
export async function deleteTestAccountsByPrefix(prefix: string) {
	await testPrisma.account.deleteMany({
		where: { name: { startsWith: prefix } },
	})
}

/**
 * リードテストデータの作成
 */
export async function createTestLead(
	userId: string,
<<<<<<< HEAD:apps/backend/src/test/utils/record.ts
) {
	const userReference = JSON.stringify({ entity_name: "user", id: userId })
=======
	data: LeadData,
): Promise<Lead> {
>>>>>>> f1675f3 (テストレコードデータ操作ユーティリティの作成):apps/api/src/test/utils/record.ts
	const lead = await testPrisma.lead.create({
		data: toLeadCreateInput(userId, data),
		select: { id: true },
	})

	return await testPrisma.lead_view.findUniqueOrThrow({
		where: { id: lead.id },
	})
}

/**
 * リードテストデータの一括作成
 */
export async function createManyTestLeads(
	userId: string,
<<<<<<< HEAD:apps/backend/src/test/utils/record.ts
) {
	const userReference = JSON.stringify({ entity_name: "user", id: userId })
	const activity = await testPrisma.activity.create({
		data: {
			subject: `test_${activityData.subject}`,
			is_all_day_event: activityData.is_all_day_event,
			is_archived: activityData.is_archived,
			owner: userReference,
			created_by: userReference,
			modified_by: userReference,
		},
		select: {
			id: true,
		},
=======
	data: Array<LeadData>,
): Promise<{ count: number }> {
	return await testPrisma.lead.createMany({
		data: data.map((d) => toLeadCreateInput(userId, d)),
>>>>>>> f1675f3 (テストレコードデータ操作ユーティリティの作成):apps/api/src/test/utils/record.ts
	})
}

/**
 * リードテストデータの全削除
 */
<<<<<<< HEAD:apps/backend/src/test/utils/record.ts
export async function createTestPhoneCall(
	phoneCallData: {
		subject: string
		user: { entity_name: string; id: string }
		their: { entity_name: string; id: string }
		direction: "inbound" | "outbound"
	},
	userId: string,
) {
	const userReference = JSON.stringify({ entity_name: "user", id: userId })
	const phoneCall = await testPrisma.phone_call.create({
		data: {
			subject: `test_${phoneCallData.subject}`,
			user: JSON.stringify(phoneCallData.user),
			their: JSON.stringify(phoneCallData.their),
			direction: JSON.stringify([phoneCallData.direction]),
			status: JSON.stringify(["connected"]), // Add status field to avoid null/undefined issues
			owner: userReference,
			created_by: userReference,
			modified_by: userReference,
		},
		select: {
			id: true,
		},
	})

	return phoneCall
=======
export async function deleteAllTestLeads() {
	await testPrisma.lead.deleteMany()
>>>>>>> f1675f3 (テストレコードデータ操作ユーティリティの作成):apps/api/src/test/utils/record.ts
}

/**
 * リードテストデータの削除（レコードID指定）
 */
<<<<<<< HEAD:apps/backend/src/test/utils/record.ts
export async function createTestContact(
	contactData: {
		last_name: string
	},
	userId: string,
) {
	const userReference = JSON.stringify({ entity_name: "user", id: userId })
	const contact = await testPrisma.contact.create({
		data: {
			last_name: `test_${contactData.last_name}`,
			owner: userReference,
			created_by: userReference,
			modified_by: userReference,
		},
		select: {
			id: true,
		},
	})

	return contact
=======
export async function deleteTestLeadById(id: string) {
	await testPrisma.lead.delete({ where: { id } })
>>>>>>> f1675f3 (テストレコードデータ操作ユーティリティの作成):apps/api/src/test/utils/record.ts
}

/**
 * リードテストデータの一括削除（Prefix指定）
 */
<<<<<<< HEAD:apps/backend/src/test/utils/record.ts
export async function createTestOpportunity(
	opportunityData: {
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
	},
	userId: string,
) {
	const userReference = JSON.stringify({ entity_name: "user", id: userId })
	const opportunity = await testPrisma.opportunity.create({
		data: {
			name: `test_${opportunityData.name}`,
			account: JSON.stringify({
				entity_name: "account",
				id: opportunityData.account,
			}),
			phase: JSON.stringify([opportunityData.phase]),
			close_date: opportunityData.close_date,
			is_closed: opportunityData.is_closed,
			owner: userReference,
			created_by: userReference,
			modified_by: userReference,
		},
		select: {
			id: true,
		},
=======
export async function deleteTestLeadsByPrefix(prefix: string) {
	await testPrisma.lead.deleteMany({
		where: { company: { startsWith: prefix } },
>>>>>>> f1675f3 (テストレコードデータ操作ユーティリティの作成):apps/api/src/test/utils/record.ts
	})
}

/**
<<<<<<< HEAD:apps/backend/src/test/utils/record.ts
 * Create a test case for tests
 */
export async function createTestCase(
	caseData: {
		case_number: string
		subject: string
	},
	userId: string,
) {
	const userReference = JSON.stringify({ entity_name: "user", id: userId })
	const testCase = await testPrisma.renamedcase.create({
		data: {
			case_number: `test_${caseData.case_number}`,
			subject: `test_${caseData.subject}`,
			owner: userReference,
			created_by: userReference,
			modified_by: userReference,
		},
		select: {
			id: true,
		},
	})

	return testCase
}

/**
 * Create a test product for tests
 */
export async function createTestProduct(
	productData: {
		name: string
	},
	userId: string,
) {
	const userReference = JSON.stringify({ entity_name: "user", id: userId })
	const product = await testPrisma.product.create({
		data: {
			name: `test_${productData.name}`,
			owner: userReference,
			created_by: userReference,
			modified_by: userReference,
		},
		select: {
			id: true,
		},
	})

	return product
}

/**
 * Create a test campaign for tests
 */
export async function createTestCampaign(
	campaignData: {
		name: string
	},
	userId: string,
) {
	const userReference = JSON.stringify({ entity_name: "user", id: userId })
	const campaign = await testPrisma.campaign.create({
		data: {
			name: `test_${campaignData.name}`,
			owner: userReference,
			created_by: userReference,
			modified_by: userReference,
		},
		select: {
			id: true,
		},
	})

	return campaign
}

/**
 * Create a test sample for tests
=======
 * サンプルテストデータの作成
>>>>>>> f1675f3 (テストレコードデータ操作ユーティリティの作成):apps/api/src/test/utils/record.ts
 */
export async function createTestSample(
	userId: string,
<<<<<<< HEAD:apps/backend/src/test/utils/record.ts
) {
	const userReference = JSON.stringify({ entity_name: "user", id: userId })
=======
	data: SampleData,
): Promise<Sample> {
>>>>>>> f1675f3 (テストレコードデータ操作ユーティリティの作成):apps/api/src/test/utils/record.ts
	const sample = await testPrisma.sample.create({
		data: toSampleCreateInput(userId, data),
		select: { id: true },
	})

	return await testPrisma.sample_view.findUniqueOrThrow({
		where: { id: sample.id },
	})
}

/**
 * 取引先テストデータの一括作成
 */
export async function createManyTestSamples(
	userId: string,
	data: Array<SampleData>,
): Promise<{ count: number }> {
	return await testPrisma.sample.createMany({
		data: data.map((d) => toSampleCreateInput(userId, d)),
	})
}

/**
 * サンプルテストデータの全削除
 */
export async function deleteAllTestSamples() {
	await testPrisma.sample.deleteMany()
}

/**
 * サンプルテストデータの削除（レコードID指定）
 */
export async function deleteTestSampleById(id: string) {
	await testPrisma.sample.delete({ where: { id } })
}

/**
 * サンプルテストデータの一括削除（Prefix指定）
 */
export async function deleteTestSamplesByPrefix(prefix: string) {
	await testPrisma.sample.deleteMany({
		where: { name: { startsWith: prefix } },
	})
}

function toAccountCreateInput(
	userId: string,
	data: AccountData,
): Prisma.accountCreateInput {
	const userReference = JSON.stringify({ entity: "user", id: userId })
	return {
		...data,
		industry: data.industry ? JSON.stringify([data.industry]) : null,
		originating_lead: data.originating_lead
			? JSON.stringify(data.originating_lead)
			: null,
		parent: data.parent ? JSON.stringify(data.parent) : null,
		owner: data.owner ? JSON.stringify(data.owner) : userReference,
		created_by: data.created_by
			? JSON.stringify(data.created_by)
			: userReference,
		modified_by: data.modified_by
			? JSON.stringify(data.modified_by)
			: userReference,
	}
}

function toLeadCreateInput(
	userId: string,
	data: LeadData,
): Prisma.leadCreateInput {
	const userReference = JSON.stringify({ entity: "user", id: userId })
	return {
		...data,
		lead_source: data.lead_source ? JSON.stringify([data.lead_source]) : null,
		status: data.status ? JSON.stringify([data.status]) : "new",
		industry: data.industry ? JSON.stringify([data.industry]) : null,
		rating: data.rating ? JSON.stringify([data.rating]) : null,
		owner: data.owner ? JSON.stringify(data.owner) : userReference,
		created_by: data.created_by
			? JSON.stringify(data.created_by)
			: userReference,
		modified_by: data.modified_by
			? JSON.stringify(data.modified_by)
			: userReference,
	}
}

function toSampleCreateInput(
	userId: string,
	data: SampleData,
): Prisma.sampleCreateInput {
	const userReference = JSON.stringify({ entity: "user", id: userId })
	return {
		...data,
		time: data.time
			? typeof data.time === "string"
				? new Date(`1970-01-01T${data.time}Z`) // Dateオブジェクトでないとエラーになるので適当な日付に変換
				: data.time
			: null,
		option_single: data.option_single
			? JSON.stringify([data.option_single])
			: null,
		option_multi: data.option_multi ? JSON.stringify(data.option_multi) : null,
		reference_single_target_single_id: data.reference_single_target_single_id
			? JSON.stringify(data.reference_single_target_single_id)
			: null,
		reference_single_target_multi_id: data.reference_single_target_multi_id
			? JSON.stringify(data.reference_single_target_multi_id)
			: null,
		reference_multi_target_single_id: data.reference_multi_target_single_id
			? JSON.stringify(data.reference_multi_target_single_id)
			: null,
		reference_multi_target_multi_id: data.reference_multi_target_multi_id
			? JSON.stringify(data.reference_multi_target_multi_id)
			: null,
		owner: data.owner ? JSON.stringify(data.owner) : userReference,
		created_by: data.created_by
			? JSON.stringify(data.created_by)
			: userReference,
		modified_by: data.modified_by
			? JSON.stringify(data.modified_by)
			: userReference,
	}
}
