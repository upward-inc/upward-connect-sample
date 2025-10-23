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

export type Contact = Awaited<
	ReturnType<typeof testPrisma.contact_view.findUniqueOrThrow>
>

export interface ContactData
	extends Omit<
		Prisma.contactCreateInput,
		"account" | "originating_lead" | "owner" | "created_by" | "modified_by"
	> {
	account?: RecordReference | null
	originating_lead?: RecordReference | null
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
	entity_name: string
	id: string
}

/**
 * 取引先テストデータの作成
 */
export async function createTestAccount(
	userId: string,
	data: AccountData,
): Promise<Account> {
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
	data: LeadData,
): Promise<Lead> {
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
	data: Array<LeadData>,
): Promise<{ count: number }> {
	return await testPrisma.lead.createMany({
		data: data.map((d) => toLeadCreateInput(userId, d)),
	})
}

/**
 * リードテストデータの全削除
 */
export async function deleteAllTestLeads() {
	await testPrisma.lead.deleteMany()
}

/**
 * リードテストデータの削除（レコードID指定）
 */
export async function deleteTestLeadById(id: string) {
	await testPrisma.lead.delete({ where: { id } })
}

/**
 * リードテストデータの一括削除（Prefix指定）
 */
export async function deleteTestLeadsByPrefix(prefix: string) {
	await testPrisma.lead.deleteMany({
		where: { company: { startsWith: prefix } },
	})
}

/**
 * 取引先担当者テストデータの作成
 */
export async function createTestContact(
	userId: string,
	data: ContactData,
): Promise<Contact> {
	const contact = await testPrisma.contact.create({
		data: toContactCreateInput(userId, data),
		select: { id: true },
	})

	return await testPrisma.contact_view.findUniqueOrThrow({
		where: { id: contact.id },
	})
}

/**
 * 取引先担当者テストデータの一括作成
 */
export async function createManyTestContacts(
	userId: string,
	data: Array<ContactData>,
): Promise<{ count: number }> {
	return await testPrisma.contact.createMany({
		data: data.map((d) => toContactCreateInput(userId, d)),
	})
}

/**
 * 取引先担当者テストデータの全削除
 */
export async function deleteAllTestContacts() {
	await testPrisma.contact.deleteMany()
}

/**
 * 取引先担当者テストデータの削除（レコードID指定）
 */
export async function deleteTestContactById(id: string) {
	await testPrisma.contact.delete({ where: { id } })
}

/**
 * 取引先担当者テストデータの一括削除（Prefix指定）
 */
export async function deleteTestContactsByPrefix(prefix: string) {
	await testPrisma.contact.deleteMany({
		where: { last_name: { startsWith: prefix } },
	})
}

/**
 * サンプルテストデータの作成
 */
export async function createTestSample(
	userId: string,
	data: SampleData,
): Promise<Sample> {
	const sample = await testPrisma.sample.create({
		data: toSampleCreateInput(userId, data),
		select: { id: true },
	})

	return await testPrisma.sample_view.findUniqueOrThrow({
		where: { id: sample.id },
	})
}

/**
 * サンプルテストデータの一括作成
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
	const userReference = JSON.stringify({ entity_name: "user", id: userId })
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
	const userReference = JSON.stringify({ entity_name: "user", id: userId })
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

function toContactCreateInput(
	userId: string,
	data: ContactData,
): Prisma.contactCreateInput {
	const userReference = JSON.stringify({ entity_name: "user", id: userId })
	return {
		...data,
		account: data.account ? JSON.stringify(data.account) : null,
		originating_lead: data.originating_lead
			? JSON.stringify(data.originating_lead)
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

function toSampleCreateInput(
	userId: string,
	data: SampleData,
): Prisma.sampleCreateInput {
	const userReference = JSON.stringify({ entity_name: "user", id: userId })
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
