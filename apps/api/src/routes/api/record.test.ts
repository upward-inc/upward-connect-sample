import type { user } from "@prisma/client"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { seedEntities } from "../../../seed/entity"
import { seedEntityItems } from "../../../seed/entity-item"
import { seedEntityItemOptions } from "../../../seed/entity-item-option"
import { app } from "../../index"
import { testPrisma } from "../../test/setup"
import { createValidToken } from "../../test/utils/auth"
import { cleanupTestData, createTestUser } from "../../test/utils/common"
import {
	createTestAccount,
	createTestActivity,
	createTestCampaign,
	createTestCase,
	createTestContact,
	createTestLead,
	createTestOpportunity,
	createTestPhoneCall,
	createTestProduct,
	createTestSample,
} from "../../test/utils/record"

describe("Record Tests", () => {
	let testLead: { id: string }
	let testAccount: { id: string }

	beforeAll(async () => {
		// Clean up any existing test data
		await cleanupTestData()

		// Create a test user for entity ownership
		const testUser = await createTestUser({
			user_name: "record_test_user",
			first_name: "Record",
			last_name: "Test",
			email: "record_test@example.com",
		})

		// Create a test lead for the test user
		testLead = await createTestLead(
			{
				company: "Test Company",
				first_name: "Test",
				last_name: "Lead",
				status: "new",
			},
			testUser.id,
		)

		// Create a test account for the test user
		testAccount = await createTestAccount(
			{
				name: "Test Account",
			},
			testUser.id,
		)

		// Seed the required entities for testing
		await seedTestEntities(testUser as user)
	})

	afterAll(async () => {
		// Clean up entity-related data
		await cleanupTestEntities()

		// Clean up all test data
		await cleanupTestData()
	})

	async function seedTestEntities(user: user) {
		await seedEntities(testPrisma, [user])
		await seedEntityItems(testPrisma)
		await seedEntityItemOptions(testPrisma)
	}

	async function cleanupTestEntities() {
		// Clean up entity-related data
		await testPrisma.entity_item_option.deleteMany()
		await testPrisma.entity_item.deleteMany()
		await testPrisma.entity.deleteMany()
	}

	describe("POST /api/records - Create Record", () => {
		it("should create a record with only required fields", async () => {
			const testUser = await createTestUser({
				user_name: "only_required_user",
				first_name: "Only",
				last_name: "Required",
				email: "only_required@example.com",
			})
			const token = createValidToken(testUser.id)

			const response = await app.request("/api/records", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					entity_name: "account",
					data: {
						name: "Test Account with Required Fields",
					},
				}),
			})

			const data = await response.json()
			expect(response.status).toBe(201)
			expect(data).toHaveProperty("id")
			expect(typeof data.id).toBe("string")

			// Verify the record was created in the database
			const createdAccount = await testPrisma.account.findFirst({
				where: { id: data.id },
			})
			expect(createdAccount).toBeTruthy()
			expect(createdAccount?.name).toBe("Test Account with Required Fields")
			expect(createdAccount?.account_number).toBeNull()
			expect(createdAccount?.main_phone_number).toBeNull()
			expect(createdAccount?.sub_phone_number).toBeNull()
			expect(createdAccount?.website).toBeNull()
			expect(createdAccount?.industry).toBeNull()
			expect(createdAccount?.number_of_employees).toBeNull()
			expect(createdAccount?.revenue).toBeNull()
			expect(createdAccount?.address_zipcode).toBeNull()
			expect(createdAccount?.address_prefecture).toBeNull()
			expect(createdAccount?.address_municipality).toBeNull()
			expect(createdAccount?.address_street).toBeNull()
			expect(createdAccount?.latitude).toBeNull()
			expect(createdAccount?.longitude).toBeNull()
			expect(createdAccount?.market_cap).toBeNull()
			expect(createdAccount?.description).toBeNull()
			expect(createdAccount?.originating_lead).toBeNull()
			expect(createdAccount?.parent).toBeNull()
			// Additional checks for ownership fields
			expect(createdAccount?.owner).toBe(
				JSON.stringify({
					entity: "user",
					id: testUser.id,
				}),
			)
			expect(createdAccount?.created_by).toBe(
				JSON.stringify({
					entity: "user",
					id: testUser.id,
				}),
			)
			expect(createdAccount?.modified_by).toBe(
				JSON.stringify({
					entity: "user",
					id: testUser.id,
				}),
			)
		})

		it("should create a record with all assignable fields", async () => {
			const testUser = await createTestUser({
				user_name: "assignable_fields_user",
				first_name: "Assignable",
				last_name: "Fields",
				email: "assignable_fields@example.com",
			})
			const token = createValidToken(testUser.id)

			const response = await app.request("/api/records", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					entity_name: "account",
					data: {
						name: "Test Account with All Fields",
						account_number: "ABCD-1234",
						main_phone_number: "03-1234-5678",
						sub_phone_number: "03-9876-5432",
						website: "https://www.example.com",
						industry: "it",
						number_of_employees: 100,
						revenue: 9999999,
						address_zipcode: "123-4567",
						address_prefecture: "東京都",
						address_municipality: "新宿区",
						address_street: "西新宿2-8-1",
						latitude: 35.6895,
						longitude: 139.6917,
						market_cap: 1000000000,
						description: "This is a test account created during testing.",
						originating_lead: testLead.id,
						parent: testAccount.id,
					},
				}),
			})

			const data = await response.json()
			expect(response.status).toBe(201)
			expect(data).toHaveProperty("id")
			expect(typeof data.id).toBe("string")

			// Verify the record was created in the database
			const createdAccount = await testPrisma.account.findFirst({
				where: { id: data.id },
			})
			expect(createdAccount).toBeTruthy()
			expect(createdAccount?.name).toBe("Test Account with All Fields")
			expect(createdAccount?.account_number).toBe("ABCD-1234")
			expect(createdAccount?.main_phone_number).toBe("03-1234-5678")
			expect(createdAccount?.sub_phone_number).toBe("03-9876-5432")
			expect(createdAccount?.website).toBe("https://www.example.com")
			expect(createdAccount?.industry).toBe('["it"]')
			expect(createdAccount?.number_of_employees?.toNumber()).toBe(100)
			expect(createdAccount?.revenue?.toNumber()).toBe(9999999)
			expect(createdAccount?.address_zipcode).toBe("123-4567")
			expect(createdAccount?.address_prefecture).toBe("東京都")
			expect(createdAccount?.address_municipality).toBe("新宿区")
			expect(createdAccount?.address_street).toBe("西新宿2-8-1")
			expect(createdAccount?.latitude?.toNumber()).toBe(35.6895)
			expect(createdAccount?.longitude?.toNumber()).toBe(139.6917)
			expect(createdAccount?.market_cap?.toNumber()).toBe(1000000000)
			expect(createdAccount?.description).toBe(
				"This is a test account created during testing.",
			)
			expect(createdAccount?.originating_lead).toBe(
				JSON.stringify({ entity: "lead", id: testLead.id }),
			)
			expect(createdAccount?.parent).toBe(
				JSON.stringify({ entity: "account", id: testAccount.id }),
			)
			// Additional checks for ownership fields
			expect(createdAccount?.owner).toBe(
				JSON.stringify({
					entity: "user",
					id: testUser.id,
				}),
			)
			expect(createdAccount?.created_by).toBe(
				JSON.stringify({
					entity: "user",
					id: testUser.id,
				}),
			)
			expect(createdAccount?.modified_by).toBe(
				JSON.stringify({
					entity: "user",
					id: testUser.id,
				}),
			)
		})

		it("should ignore not creatable field in data", async () => {
			const testUser = await createTestUser({
				user_name: "ignore_id_user",
				first_name: "Ignore",
				last_name: "ID",
				email: "ignore_id@example.com",
			})
			const token = createValidToken(testUser.id)

			const response = await app.request("/api/records", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					entity_name: "account",
					data: {
						id: "some-custom-id",
						name: "Test Account with ID",
					},
				}),
			})

			const data = await response.json()
			expect(response.status).toBe(201)
			expect(data).toHaveProperty("id")
			// The returned ID should not be the one we provided
			expect(data.id).not.toBe("some-custom-id")
		})

		it("should ignore unknown field in data", async () => {
			const testUser = await createTestUser({
				user_name: "ignore_unknown_user",
				first_name: "Ignore",
				last_name: "Unknown",
				email: "ignore_unknown@example.com",
			})
			const token = createValidToken(testUser.id)

			const response = await app.request("/api/records", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					entity_name: "account",
					data: {
						unknown: "some value",
						name: "Test Account with ID",
					},
				}),
			})

			const data = await response.json()
			expect(response.status).toBe(201)
			expect(data).not.toHaveProperty("unknown")
		})

		it("should return 401 for missing authorization header", async () => {
			const response = await app.request("/api/records", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					entity_name: "account",
					data: {
						name: "Test Account",
					},
				}),
			})

			const data = await response.json()
			expect(response.status).toBe(401)
			expect(data).toEqual({
				message: "No authentication header",
			})
		})

		it("should return 400 for invalid request body", async () => {
			const testUser = await createTestUser({
				user_name: "invalid_body_user",
				first_name: "Invalid",
				last_name: "Body",
				email: "invalid_body@example.com",
			})
			const token = createValidToken(testUser.id)

			const response = await app.request("/api/records", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: "Invalid JSON Body",
			})

			const data = await response.json()
			expect(response.status).toBe(400)
			expect(data).toEqual({
				message: "Malformed JSON in request body",
			})
		})

		it("should return 400 for missing entity_name", async () => {
			const testUser = await createTestUser({
				user_name: "invalid_entity_user",
				first_name: "Invalid",
				last_name: "User",
				email: "invalid_entity@example.com",
			})
			const token = createValidToken(testUser.id)

			const response = await app.request("/api/records", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					data: {
						name: "Test Account",
					},
				}),
			})

			const data = await response.json()
			expect(response.status).toBe(400)
			expect(data.success).toBe(false)
			expect(data.error).toHaveProperty("issues")
			expect(data.error.issues[0].path).toContainEqual("entity_name")
		})

		it("should return 400 for missing data field", async () => {
			const testUser = await createTestUser({
				user_name: "missing_data_user",
				first_name: "Missing",
				last_name: "User",
				email: "missing_data@example.com",
			})
			const token = createValidToken(testUser.id)

			const response = await app.request("/api/records", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					entity_name: "account",
				}),
			})

			const data = await response.json()
			expect(response.status).toBe(400)
			expect(data.success).toBe(false)
			expect(data.error).toHaveProperty("issues")
			expect(data.error.issues[0].path).toContainEqual("data")
		})

		it("should return 400 for nonexistent entity", async () => {
			const testUser = await createTestUser({
				user_name: "nonexistent_entity_user",
				first_name: "Nonexistent",
				last_name: "User",
				email: "nonexistent_entity@example.com",
			})
			const token = createValidToken(testUser.id)

			const response = await app.request("/api/records", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					entity_name: "nonexistent_entity",
					data: {
						name: "Test",
					},
				}),
			})

			const data = await response.json()
			expect(response.status).toBe(400)
			expect(data).toEqual({
				message: "Entity 'nonexistent_entity' does not exist",
			})
		})

		it("should return 400 for missing required fields", async () => {
			const testUser = await createTestUser({
				user_name: "missing_required_user",
				first_name: "Missing",
				last_name: "Required",
				email: "missing_required@example.com",
			})
			const token = createValidToken(testUser.id)

			const response = await app.request("/api/records", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					entity_name: "account",
					data: {
						// Missing required 'name' field
					},
				}),
			})

			const data = await response.json()
			expect(response.status).toBe(400)
			expect(data).toEqual({
				message: "Field 'name' is required for 'account'",
			})
		})

		it("should return 400 for nonexistent reference", async () => {
			const testUser = await createTestUser({
				user_name: "nonexistent_reference_user",
				first_name: "Nonexistent",
				last_name: "Reference",
				email: "nonexistent_reference@example.com",
			})
			const token = createValidToken(testUser.id)

			const response = await app.request("/api/records", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					entity_name: "account",
					data: {
						name: "Test Account with Bad Reference",
						originating_lead: crypto.randomUUID(), // Nonexistent lead ID
					},
				}),
			})

			const data = await response.json()
			expect(response.status).toBe(400)
			expect(data.message).toContain(
				"does not exist in any of: 'lead' for 'account'",
			)
		})

		it("should return 400 for invalid option", async () => {
			const testUser = await createTestUser({
				user_name: "invalid_option_user",
				first_name: "Invalid",
				last_name: "Option",
				email: "invalid_option@example.com",
			})
			const token = createValidToken(testUser.id)

			const response = await app.request("/api/records", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					entity_name: "account",
					data: {
						name: "Test Account with Invalid Option",
						industry: "nonexistent_option",
					},
				}),
			})

			const data = await response.json()
			expect(response.status).toBe(400)
			expect(data.message).toContain("Field 'industry' must be one of: ")
		})

		it("should return 400 for invalid data type", async () => {
			const testUser = await createTestUser({
				user_name: "invalid_type_user",
				first_name: "Invalid",
				last_name: "Type",
				email: "invalid_type@example.com",
			})
			const token = createValidToken(testUser.id)

			const response = await app.request("/api/records", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					entity_name: "account",
					data: {
						name: "Test Account with Invalid Type",
						revenue: "123456", // Invalid type
					},
				}),
			})

			const data = await response.json()
			expect(response.status).toBe(400)
			expect(data).toEqual({
				message: "Field 'revenue' must be an integer for 'account'",
			})
		})
	})

	describe("GET /api/records - Get Record List", () => {
		it("should return record list with only entity name", async () => {
			const testUser = await createTestUser({
				user_name: "list_user",
				first_name: "List",
				last_name: "User",
				email: "list_user@example.com",
			})
			const token = createValidToken(testUser.id)

			const testCreatedAccount = await createTestAccount(
				{
					name: "List Test Account",
				},
				testUser.id,
			)

			const response = await app.request("/api/records?entity_name=account", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})

			const data = await response.json()
			expect(response.status).toBe(200)
			expect(data).toHaveProperty("has_next_page")
			expect(data).toHaveProperty("total_size")
			expect(data).toHaveProperty("data")
			expect(Array.isArray(data.data)).toBe(true)
			expect(
				data.data.some(
					(record: { id: string }) => record.id === testCreatedAccount.id,
				),
			).toBe(true)
		})

		it("should return record list with specified field", async () => {
			const testUser = await createTestUser({
				user_name: "fields_test_user",
				first_name: "Fields",
				last_name: "Test",
				email: "fields_test@example.com",
			})
			const token = createValidToken(testUser.id)

			const testCreatedAccount = await createTestAccount(
				{
					name: "Fields Test Account",
					account_number: "FIELD-123",
					main_phone_number: "03-1234-5678",
				},
				testUser.id,
			)

			const response = await app.request(
				"/api/records?entity_name=account&fields=id,name,account_number",
				{
					method: "GET",
					headers: {
						Authorization: `Bearer ${token}`,
					},
				},
			)

			const data = await response.json()
			expect(response.status).toBe(200)
			expect(data).toHaveProperty("has_next_page")
			expect(data).toHaveProperty("total_size")
			expect(data).toHaveProperty("data")
			expect(Array.isArray(data.data)).toBe(true)

			// Find the test account in the results
			const testAccount = data.data.find(
				(record: { id: string }) => record.id === testCreatedAccount.id,
			)
			expect(testAccount).toBeTruthy()
			expect(testAccount).toHaveProperty("id")
			expect(testAccount).toHaveProperty("name", "test_Fields Test Account")
			expect(testAccount).toHaveProperty("account_number", "FIELD-123")
			// Verify that other fields are not included when not specified
			expect(testAccount).not.toHaveProperty("main_phone_number")
			expect(testAccount).not.toHaveProperty("website")
		})

		it("should return record list with base filter", async () => {
			const testUser = await createTestUser({
				user_name: "base_filter_user",
				first_name: "Base",
				last_name: "Filter",
				email: "base_filter@example.com",
			})
			const token = createValidToken(testUser.id)

			// Create test accounts with different names
			const activeAccount = await createTestAccount(
				{
					name: "Active Test Account",
				},
				testUser.id,
			)

			await createTestAccount(
				{
					name: "Inactive Test Account",
				},
				testUser.id,
			)

			// Test filtering by name using "eq" operator
			const filterQuery = encodeURIComponent(
				JSON.stringify({
					field: "name",
					operator: "eq",
					value: "test_Active Test Account",
					is_not: false,
				}),
			)

			const response = await app.request(
				`/api/records?entity_name=account&filter=${filterQuery}`,
				{
					method: "GET",
					headers: {
						Authorization: `Bearer ${token}`,
					},
				},
			)

			const data = await response.json()
			expect(response.status).toBe(200)
			expect(data).toHaveProperty("has_next_page")
			expect(data).toHaveProperty("total_size")
			expect(data).toHaveProperty("data")
			expect(Array.isArray(data.data)).toBe(true)

			// Should only return the active account
			const foundActiveAccount = data.data.find(
				(record: { id: string }) => record.id === activeAccount.id,
			)
			expect(foundActiveAccount).toBeTruthy()
			expect(foundActiveAccount.name).toBe("test_Active Test Account")

			// Should not contain accounts with different names
			const shouldNotExist = data.data.find(
				(record: { name: string }) =>
					record.name === "test_Inactive Test Account",
			)
			expect(shouldNotExist).toBeUndefined()
		})

		it("should return record list with nest and filter", async () => {
			const testUser = await createTestUser({
				user_name: "nest_and_filter_user",
				first_name: "Nest",
				last_name: "AndFilter",
				email: "nest_and_filter@example.com",
			})
			const token = createValidToken(testUser.id)

			// Create test accounts with different attributes
			const targetAccount = await createTestAccount(
				{
					name: "Target Company",
					number_of_employees: 100,
				},
				testUser.id,
			)

			await createTestAccount(
				{
					name: "Target Company",
					number_of_employees: 200,
				},
				testUser.id,
			)

			await createTestAccount(
				{
					name: "Other Company",
					number_of_employees: 100,
				},
				testUser.id,
			)

			// Test nested AND filter: name = "Target Company" AND number_of_employees = 100
			const filterQuery = encodeURIComponent(
				JSON.stringify({
					and: [
						{
							field: "name",
							operator: "eq",
							value: "test_Target Company",
							is_not: false,
						},
						{
							field: "number_of_employees",
							operator: "eq",
							value: 100,
							is_not: false,
						},
					],
				}),
			)

			const response = await app.request(
				`/api/records?entity_name=account&filter=${filterQuery}`,
				{
					method: "GET",
					headers: {
						Authorization: `Bearer ${token}`,
					},
				},
			)

			const data = await response.json()
			expect(response.status).toBe(200)
			expect(data).toHaveProperty("data")
			expect(Array.isArray(data.data)).toBe(true)

			// Should only return the account that matches both conditions
			expect(data.data).toHaveLength(1)
			const foundAccount = data.data[0]
			expect(foundAccount.id).toBe(targetAccount.id)
			expect(foundAccount.name).toBe("test_Target Company")
			expect(foundAccount.number_of_employees).toBe(100)
		})

		it("should return record list with nest or filter", async () => {
			const testUser = await createTestUser({
				user_name: "nest_or_filter_user",
				first_name: "Nest",
				last_name: "OrFilter",
				email: "nest_or_filter@example.com",
			})
			const token = createValidToken(testUser.id)

			// Create test accounts with different attributes
			const account1 = await createTestAccount(
				{
					name: "Company A",
					number_of_employees: 50,
				},
				testUser.id,
			)

			const account2 = await createTestAccount(
				{
					name: "Company B",
					number_of_employees: 150,
				},
				testUser.id,
			)

			await createTestAccount(
				{
					name: "Company C",
					number_of_employees: 75,
				},
				testUser.id,
			)

			// Test nested OR filter: name = "Company A" OR number_of_employees = 150
			const filterQuery = encodeURIComponent(
				JSON.stringify({
					or: [
						{
							field: "name",
							operator: "eq",
							value: "test_Company A",
							is_not: false,
						},
						{
							field: "number_of_employees",
							operator: "eq",
							value: 150,
							is_not: false,
						},
					],
				}),
			)

			const response = await app.request(
				`/api/records?entity_name=account&filter=${filterQuery}`,
				{
					method: "GET",
					headers: {
						Authorization: `Bearer ${token}`,
					},
				},
			)

			const data = await response.json()
			expect(response.status).toBe(200)
			expect(data).toHaveProperty("data")
			expect(Array.isArray(data.data)).toBe(true)

			// Should return accounts that match either condition
			expect(data.data).toHaveLength(2)
			const foundIds = data.data.map((record: { id: string }) => record.id)
			expect(foundIds).toContain(account1.id)
			expect(foundIds).toContain(account2.id)

			// Verify the correct accounts are returned
			const foundAccount1 = data.data.find(
				(record: { id: string }) => record.id === account1.id,
			)
			expect(foundAccount1.name).toBe("test_Company A")

			const foundAccount2 = data.data.find(
				(record: { id: string }) => record.id === account2.id,
			)
			expect(foundAccount2.name).toBe("test_Company B")
			expect(foundAccount2.number_of_employees).toBe(150)
		})

		it("should return record list with order_by parameter", async () => {
			const testUser = await createTestUser({
				user_name: "order_by_user",
				first_name: "Order",
				last_name: "By",
				email: "order_by@example.com",
			})
			const token = createValidToken(testUser.id)

			// Create test accounts with specific naming pattern for sorting
			const accounts = []
			accounts.push(
				await createTestAccount(
					{
						name: "OrderBy_Zebra_Company",
					},
					testUser.id,
				),
			)

			accounts.push(
				await createTestAccount(
					{
						name: "OrderBy_Alpha_Company",
					},
					testUser.id,
				),
			)

			accounts.push(
				await createTestAccount(
					{
						name: "OrderBy_Beta_Company",
					},
					testUser.id,
				),
			)

			// Test ordering by name in ascending order with a specific filter to isolate our test data
			const orderByQuery = encodeURIComponent(
				JSON.stringify([{ field: "name", direction: "asc" }]),
			)

			const filterQuery = encodeURIComponent(
				JSON.stringify({
					field: "name",
					operator: "starts_with",
					value: "test_OrderBy_",
					is_not: false,
				}),
			)

			const response = await app.request(
				`/api/records?entity_name=account&order_by=${orderByQuery}&filter=${filterQuery}`,
				{
					method: "GET",
					headers: {
						Authorization: `Bearer ${token}`,
					},
				},
			)

			const data = await response.json()
			expect(response.status).toBe(200)
			expect(data).toHaveProperty("data")
			expect(Array.isArray(data.data)).toBe(true)
			expect(data.data.length).toBe(3)

			// Check if records are sorted by name in ascending order
			const names = data.data.map((record: { name: string }) => record.name)
			expect(names).toEqual([
				"test_OrderBy_Alpha_Company",
				"test_OrderBy_Beta_Company",
				"test_OrderBy_Zebra_Company",
			])
		})

		it("should return record list with pagination (limit and offset)", async () => {
			const testUser = await createTestUser({
				user_name: "pagination_user",
				first_name: "Pagination",
				last_name: "Test",
				email: "pagination@example.com",
			})
			const token = createValidToken(testUser.id)

			// Create multiple test accounts for pagination testing
			const createdAccounts = []
			for (let i = 1; i <= 5; i++) {
				const account = await createTestAccount(
					{
						name: `Pagination Test Account ${i.toString().padStart(2, "0")}`,
					},
					testUser.id,
				)
				createdAccounts.push(account)
			}

			// Test pagination with limit=2, offset=1
			const response = await app.request(
				"/api/records?entity_name=account&limit=2&offset=1",
				{
					method: "GET",
					headers: {
						Authorization: `Bearer ${token}`,
					},
				},
			)

			const data = await response.json()
			expect(response.status).toBe(200)
			expect(data).toHaveProperty("has_next_page")
			expect(data).toHaveProperty("total_size")
			expect(data).toHaveProperty("data")
			expect(Array.isArray(data.data)).toBe(true)

			// Should return exactly 2 records due to limit
			expect(data.data.length).toBeLessThanOrEqual(2)
			// Should have next page since we have more records
			expect(data.has_next_page).toBe(true)
			// Total size should be at least 5 (our created accounts)
			expect(data.total_size).toBeGreaterThanOrEqual(5)
		})

		it("should return record list with grouping", async () => {
			const testUser = await createTestUser({
				user_name: "group_by_user",
				first_name: "Group",
				last_name: "By",
				email: "group_by@example.com",
			})
			const token = createValidToken(testUser.id)

			// Create test accounts with different industries for grouping
			await createTestAccount(
				{
					name: "Tech Company 1",
					industry: "it",
				},
				testUser.id,
			)

			await createTestAccount(
				{
					name: "Tech Company 2",
					industry: "it",
				},
				testUser.id,
			)

			await createTestAccount(
				{
					name: "Finance Company",
					industry: "finance",
				},
				testUser.id,
			)

			// Test grouping by industry
			const groupByQuery = encodeURIComponent("industry")

			const orderByQuery = encodeURIComponent(
				JSON.stringify([{ field: "industry", direction: "asc" }]),
			)

			const response = await app.request(
				`/api/records?entity_name=account&fields=industry&group_by=${groupByQuery}&order_by=${orderByQuery}`,
				{
					method: "GET",
					headers: {
						Authorization: `Bearer ${token}`,
					},
				},
			)

			const data = await response.json()

			expect(response.status).toBe(200)
			expect(data).toHaveProperty("data")
			expect(Array.isArray(data.data)).toBe(true)

			// Should return grouped results by industry
			const industries = data.data.map(
				(record: { industry: string }) => record.industry,
			)
			// Should contain unique industries
			const uniqueIndustries = Array.from(new Set(industries))
			expect(industries.length).toBe(uniqueIndustries.length)
			expect(uniqueIndustries).toContain("it")
			expect(uniqueIndustries).toContain("finance")
		})

		it("should return record list with numeric filter (greater than)", async () => {
			const testUser = await createTestUser({
				user_name: "numeric_filter_user",
				first_name: "Numeric",
				last_name: "Filter",
				email: "numeric_filter@example.com",
			})
			const token = createValidToken(testUser.id)

			// Create test accounts with different employee counts
			const largeAccount = await createTestAccount(
				{
					name: "Large Company",
					number_of_employees: 500,
				},
				testUser.id,
			)

			await createTestAccount(
				{
					name: "Small Company",
					number_of_employees: 50,
				},
				testUser.id,
			)

			// Test filtering by number_of_employees > 100
			const filterQuery = encodeURIComponent(
				JSON.stringify({
					field: "number_of_employees",
					operator: "gt",
					value: 100,
					is_not: false,
				}),
			)

			const response = await app.request(
				`/api/records?entity_name=account&filter=${filterQuery}`,
				{
					method: "GET",
					headers: {
						Authorization: `Bearer ${token}`,
					},
				},
			)

			const data = await response.json()
			expect(response.status).toBe(200)
			expect(data).toHaveProperty("data")
			expect(Array.isArray(data.data)).toBe(true)

			// Should only return the large company
			const foundLargeAccount = data.data.find(
				(record: { id: string }) => record.id === largeAccount.id,
			)
			expect(foundLargeAccount).toBeTruthy()
			expect(foundLargeAccount.name).toBe("test_Large Company")
			expect(foundLargeAccount.number_of_employees).toBe(500)

			// Should not contain companies with 100 or fewer employees
			const shouldNotExist = data.data.find(
				(record: { name: string }) => record.name === "Small Company",
			)
			expect(shouldNotExist).toBeUndefined()
		})

		it("should return record list with text filter (contains)", async () => {
			const testUser = await createTestUser({
				user_name: "text_filter_user",
				first_name: "Text",
				last_name: "Filter",
				email: "text_filter@example.com",
			})
			const token = createValidToken(testUser.id)

			// Create test accounts with different names
			const techAccount = await createTestAccount(
				{
					name: "Advanced Technology Solutions",
				},
				testUser.id,
			)

			await createTestAccount(
				{
					name: "Basic Services Company",
				},
				testUser.id,
			)

			// Test filtering by name containing "Technology"
			const filterQuery = encodeURIComponent(
				JSON.stringify({
					field: "name",
					operator: "match",
					value: "Technology",
					is_not: false,
				}),
			)

			const response = await app.request(
				`/api/records?entity_name=account&filter=${filterQuery}`,
				{
					method: "GET",
					headers: {
						Authorization: `Bearer ${token}`,
					},
				},
			)

			const data = await response.json()
			expect(response.status).toBe(200)
			expect(data).toHaveProperty("data")
			expect(Array.isArray(data.data)).toBe(true)

			// Should only return the tech account
			const foundTechAccount = data.data.find(
				(record: { id: string }) => record.id === techAccount.id,
			)
			expect(foundTechAccount).toBeTruthy()
			expect(foundTechAccount.name).toBe("test_Advanced Technology Solutions")

			// Should not contain companies without "Technology" in name
			const shouldNotExist = data.data.find(
				(record: { name: string }) => record.name === "Basic Services Company",
			)
			expect(shouldNotExist).toBeUndefined()
		})

		it("should return record list with negated filter (is_not: true)", async () => {
			const testUser = await createTestUser({
				user_name: "negated_filter_user",
				first_name: "Negated",
				last_name: "Filter",
				email: "negated_filter@example.com",
			})
			const token = createValidToken(testUser.id)

			// Create test accounts with different names
			const excludedAccount = await createTestAccount(
				{
					name: "Excluded Company",
				},
				testUser.id,
			)

			const includedAccount = await createTestAccount(
				{
					name: "Included Company",
				},
				testUser.id,
			)

			// Test filtering to exclude "Excluded Company" (NOT name = "Excluded Company")
			const filterQuery = encodeURIComponent(
				JSON.stringify({
					field: "name",
					operator: "eq",
					value: "test_Excluded Company",
					is_not: true,
				}),
			)

			const response = await app.request(
				`/api/records?entity_name=account&filter=${filterQuery}`,
				{
					method: "GET",
					headers: {
						Authorization: `Bearer ${token}`,
					},
				},
			)

			const data = await response.json()
			expect(response.status).toBe(200)
			expect(data).toHaveProperty("data")
			expect(Array.isArray(data.data)).toBe(true)

			// Should contain the included account
			const foundIncludedAccount = data.data.find(
				(record: { id: string }) => record.id === includedAccount.id,
			)
			expect(foundIncludedAccount).toBeTruthy()
			expect(foundIncludedAccount.name).toBe("test_Included Company")

			// Should not contain the excluded account
			const shouldNotExist = data.data.find(
				(record: { id: string }) => record.id === excludedAccount.id,
			)
			expect(shouldNotExist).toBeUndefined()
		})

		it("should return record list with is_set filter", async () => {
			const testUser = await createTestUser({
				user_name: "is_set_filter_user",
				first_name: "IsSet",
				last_name: "Filter",
				email: "is_set_filter@example.com",
			})
			const token = createValidToken(testUser.id)

			// Create test accounts - one with website, one without
			const accountWithWebsite = await createTestAccount(
				{
					name: "Company With Website",
					website: "https://www.example.com",
				},
				testUser.id,
			)

			const accountWithoutWebsite = await createTestAccount(
				{
					name: "Company Without Website",
					// website is not set (null)
				},
				testUser.id,
			)

			// Test filtering for records where website IS SET (not null)
			const filterQuery = encodeURIComponent(
				JSON.stringify({
					field: "website",
					operator: "is_set",
					is_not: false,
				}),
			)

			const response = await app.request(
				`/api/records?entity_name=account&filter=${filterQuery}`,
				{
					method: "GET",
					headers: {
						Authorization: `Bearer ${token}`,
					},
				},
			)

			const data = await response.json()
			expect(response.status).toBe(200)
			expect(data).toHaveProperty("data")
			expect(Array.isArray(data.data)).toBe(true)

			// Should contain the account with website
			const foundAccountWithWebsite = data.data.find(
				(record: { id: string }) => record.id === accountWithWebsite.id,
			)
			expect(foundAccountWithWebsite).toBeTruthy()
			expect(foundAccountWithWebsite.name).toBe("test_Company With Website")
			expect(foundAccountWithWebsite.website).toBe("https://www.example.com")

			// Should not contain the account without website
			const shouldNotExist = data.data.find(
				(record: { id: string }) => record.id === accountWithoutWebsite.id,
			)
			expect(shouldNotExist).toBeUndefined()
		})

		it("should return record list for user entity", async () => {
			const testUser = await createTestUser({
				user_name: "user_entity_test",
				first_name: "User",
				last_name: "Entity",
				email: "user_entity@example.com",
			})
			const token = createValidToken(testUser.id)

			const response = await app.request("/api/records?entity_name=user", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})

			const data = await response.json()
			expect(response.status).toBe(200)
			expect(data).toHaveProperty("has_next_page")
			expect(data).toHaveProperty("total_size")
			expect(data).toHaveProperty("data")
			expect(Array.isArray(data.data)).toBe(true)

			// Should find test user
			const foundTestUser = data.data.find(
				(record: { id: string }) => record.id === testUser.id,
			)
			expect(foundTestUser).toBeTruthy()
			expect(foundTestUser.user_name).toBe("test_user_entity_test")
			expect(foundTestUser.first_name).toBe("User")
			expect(foundTestUser.last_name).toBe("Entity")
		})

		it("should return record list for lead entity", async () => {
			const testUser = await createTestUser({
				user_name: "lead_entity_test",
				first_name: "Lead",
				last_name: "Entity",
				email: "lead_entity@example.com",
			})
			const token = createValidToken(testUser.id)

			// Create test lead
			const lead = await createTestLead(
				{
					company: "Qualified Lead Company",
					first_name: "John",
					last_name: "Qualified",
					status: "qualified",
				},
				testUser.id,
			)

			const response = await app.request("/api/records?entity_name=lead", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})

			const data = await response.json()
			expect(response.status).toBe(200)
			expect(data).toHaveProperty("has_next_page")
			expect(data).toHaveProperty("total_size")
			expect(data).toHaveProperty("data")
			expect(Array.isArray(data.data)).toBe(true)

			// Should find test lead
			const foundLead = data.data.find(
				(record: { id: string }) => record.id === lead.id,
			)
			expect(foundLead).toBeTruthy()
			expect(foundLead.company).toBe("test_Qualified Lead Company")
			expect(foundLead.first_name).toBe("John")
			expect(foundLead.last_name).toBe("Qualified")
		})

		it("should return record list for activity entity", async () => {
			const testUser = await createTestUser({
				user_name: "activity_entity_test",
				first_name: "Activity",
				last_name: "Entity",
				email: "activity_entity@example.com",
			})
			const token = createValidToken(testUser.id)

			// Create test activities
			const activity = await createTestActivity(
				{
					subject: "Activity",
					is_all_day_event: true,
					is_archived: false,
				},
				testUser.id,
			)

			const response = await app.request("/api/records?entity_name=activity", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})

			const data = await response.json()
			expect(response.status).toBe(200)
			expect(data).toHaveProperty("has_next_page")
			expect(data).toHaveProperty("total_size")
			expect(data).toHaveProperty("data")
			expect(Array.isArray(data.data)).toBe(true)

			// Should find test activity
			const foundMeetingActivity = data.data.find(
				(record: { id: string }) => record.id === activity.id,
			)
			expect(foundMeetingActivity).toBeTruthy()
			expect(foundMeetingActivity.subject).toBe("test_Activity")
			expect(foundMeetingActivity.is_all_day_event).toBe(true)
			expect(foundMeetingActivity.is_archived).toBe(false)
		})

		it("should return record list for phone_call entity", async () => {
			const testUser = await createTestUser({
				user_name: "phone_call_entity_test",
				first_name: "PhoneCall",
				last_name: "Entity",
				email: "phone_call_entity@example.com",
			})
			const token = createValidToken(testUser.id)

			// Create a test account for the call
			const testAccount = await createTestAccount(
				{
					name: "Call Test Company",
				},
				testUser.id,
			)

			// Create test phone call
			const phoneCall = await createTestPhoneCall(
				{
					subject: "Customer Inquiry",
					user: { entity: "user", id: testUser.id },
					their: { entity: "account", id: testAccount.id },
					direction: "inbound",
				},
				testUser.id,
			)

			const response = await app.request(
				"/api/records?entity_name=phone_call",
				{
					method: "GET",
					headers: {
						Authorization: `Bearer ${token}`,
					},
				},
			)

			const data = await response.json()
			expect(response.status).toBe(200)
			expect(data).toHaveProperty("has_next_page")
			expect(data).toHaveProperty("total_size")
			expect(data).toHaveProperty("data")
			expect(Array.isArray(data.data)).toBe(true)

			// Should find test phone call
			const foundCall = data.data.find(
				(record: { id: string }) => record.id === phoneCall.id,
			)
			expect(foundCall).toBeTruthy()
			expect(foundCall.subject).toBe("test_Customer Inquiry")
			expect(foundCall.user).toEqual({
				entity: "user",
				id: testUser.id,
				title: "EntityPhoneCall",
			})
			expect(foundCall.their).toEqual({
				entity: "account",
				id: testAccount.id,
				title: "test_Call Test Company",
			})
			expect(foundCall.direction).toBe("inbound")
		})

		it("should return record list with SQL reserved keyword (user)", async () => {
			const targetUser = await createTestUser({
				user_name: "phone_call_user_test",
				first_name: "PhoneCall",
				last_name: "User",
				email: "phone_call_user@example.com",
			})
			const anotherUser = await createTestUser({
				user_name: "another_user",
				first_name: "Another",
				last_name: "User",
				email: "another_user@example.com",
			})
			const token = createValidToken(targetUser.id)

			// Create a test account for the call
			const testAccount = await createTestAccount(
				{
					name: "Call Test Company",
				},
				targetUser.id,
			)

			// Create test phone calls
			await createTestPhoneCall(
				{
					subject: "Target Call",
					user: { entity: "user", id: targetUser.id },
					their: { entity: "account", id: testAccount.id },
					direction: "inbound",
				},
				targetUser.id,
			)
			await createTestPhoneCall(
				{
					subject: "Another Call",
					user: { entity: "user", id: anotherUser.id },
					their: { entity: "account", id: testAccount.id },
					direction: "inbound",
				},
				targetUser.id,
			)

			// Create clauses with reserved keyword "user"
			const whereClause = encodeURIComponent(
				JSON.stringify({
					field: "user",
					operator: "eq",
					value: targetUser.id,
					is_not: false,
				}),
			)
			const orderByClause = encodeURIComponent(
				JSON.stringify([{ field: "user", direction: "desc" }]),
			)

			const response = await app.request(
				`/api/records?entity_name=phone_call&fields=user&filter=${whereClause}&order_by=${orderByClause}`,
				{
					method: "GET",
					headers: {
						Authorization: `Bearer ${token}`,
					},
				},
			)

			const data = await response.json()
			expect(response.status).toBe(200)
			expect(data).toHaveProperty("has_next_page")
			expect(data).toHaveProperty("total_size")
			expect(data).toHaveProperty("data")
			expect(Array.isArray(data.data)).toBe(true)

			// Should find target phone call
			const foundCall = data.data.find(
				(record: { user: { entity: string; id: string } }) =>
					record.user.id === targetUser.id,
			)
			expect(foundCall).toBeTruthy()
			expect(foundCall.user).toEqual({
				entity: "user",
				id: targetUser.id,
				title: "UserPhoneCall",
			})

			// Should not find another phone call
			const shouldNotExist = data.data.find(
				(record: { user: { entity: string; id: string } }) =>
					record.user.id === anotherUser.id,
			)
			expect(shouldNotExist).toBeUndefined()
		})

		it("should return record list for contact entity", async () => {
			const testUser = await createTestUser({
				user_name: "contact_entity_test",
				first_name: "Contact",
				last_name: "Entity",
				email: "contact_entity@example.com",
			})
			const token = createValidToken(testUser.id)

			// Create test contact
			const contact = await createTestContact(
				{
					last_name: "Primary Contact",
				},
				testUser.id,
			)

			const response = await app.request("/api/records?entity_name=contact", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})

			const data = await response.json()
			expect(response.status).toBe(200)
			expect(data).toHaveProperty("has_next_page")
			expect(data).toHaveProperty("total_size")
			expect(data).toHaveProperty("data")
			expect(Array.isArray(data.data)).toBe(true)

			// Should find test contact
			const foundContact = data.data.find(
				(record: { id: string }) => record.id === contact.id,
			)
			expect(foundContact).toBeTruthy()
			expect(foundContact.last_name).toBe("test_Primary Contact")
		})

		it("should return record list for opportunity entity", async () => {
			const testUser = await createTestUser({
				user_name: "opportunity_entity_test",
				first_name: "Opportunity",
				last_name: "Entity",
				email: "opportunity_entity@example.com",
			})
			const token = createValidToken(testUser.id)

			// Create a test account for the opportunities
			const testAccount = await createTestAccount(
				{
					name: "Opportunity Test Company",
				},
				testUser.id,
			)

			// Create test opportunity
			const opportunity = await createTestOpportunity(
				{
					name: "Deal",
					account: testAccount.id,
					phase: "proposal",
					close_date: new Date("2024-03-31"),
					is_closed: false,
				},
				testUser.id,
			)

			const response = await app.request(
				"/api/records?entity_name=opportunity",
				{
					method: "GET",
					headers: {
						Authorization: `Bearer ${token}`,
					},
				},
			)

			const data = await response.json()
			expect(response.status).toBe(200)
			expect(data).toHaveProperty("has_next_page")
			expect(data).toHaveProperty("total_size")
			expect(data).toHaveProperty("data")
			expect(Array.isArray(data.data)).toBe(true)

			// Should find test opportunity
			const foundOpportunity = data.data.find(
				(record: { id: string }) => record.id === opportunity.id,
			)
			expect(foundOpportunity).toBeTruthy()
			expect(foundOpportunity.name).toBe("test_Deal")
			expect(foundOpportunity.account).toEqual({
				entity: "account",
				id: testAccount.id,
				title: "test_Opportunity Test Company",
			})
			expect(foundOpportunity.phase).toBe("proposal")
			expect(new Date(foundOpportunity.close_date)).toEqual(
				new Date("2024-03-31"),
			)
			expect(foundOpportunity.is_closed).toBe(false)
		})

		it("should return record list for case entity", async () => {
			const testUser = await createTestUser({
				user_name: "case_entity_test",
				first_name: "Case",
				last_name: "Entity",
				email: "case_entity@example.com",
			})
			const token = createValidToken(testUser.id)

			// Create test case
			const testCase = await createTestCase(
				{
					case_number: "CASE-001",
					subject: "Case",
				},
				testUser.id,
			)

			const response = await app.request("/api/records?entity_name=case", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})

			const data = await response.json()
			expect(response.status).toBe(200)
			expect(data).toHaveProperty("has_next_page")
			expect(data).toHaveProperty("total_size")
			expect(data).toHaveProperty("data")
			expect(Array.isArray(data.data)).toBe(true)

			// Should find test case
			const foundHighPriorityCase = data.data.find(
				(record: { id: string }) => record.id === testCase.id,
			)
			expect(foundHighPriorityCase).toBeTruthy()
			expect(foundHighPriorityCase.case_number).toBe("test_CASE-001")
			expect(foundHighPriorityCase.subject).toBe("test_Case")
		})

		it("should return record list for product entity", async () => {
			const testUser = await createTestUser({
				user_name: "product_entity_test",
				first_name: "Product",
				last_name: "Entity",
				email: "product_entity@example.com",
			})
			const token = createValidToken(testUser.id)

			// Create test product
			const product = await createTestProduct(
				{
					name: "Product",
				},
				testUser.id,
			)

			const response = await app.request("/api/records?entity_name=product", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})

			const data = await response.json()
			expect(response.status).toBe(200)
			expect(data).toHaveProperty("has_next_page")
			expect(data).toHaveProperty("total_size")
			expect(data).toHaveProperty("data")
			expect(Array.isArray(data.data)).toBe(true)

			// Should find test product
			const foundProduct = data.data.find(
				(record: { id: string }) => record.id === product.id,
			)
			expect(foundProduct).toBeTruthy()
			expect(foundProduct.name).toBe("test_Product")
		})

		it("should return record list for campaign entity", async () => {
			const testUser = await createTestUser({
				user_name: "campaign_entity_test",
				first_name: "Campaign",
				last_name: "Entity",
				email: "campaign_entity@example.com",
			})
			const token = createValidToken(testUser.id)

			// Create test campaign
			const campaign = await createTestCampaign(
				{
					name: "Campaign",
				},
				testUser.id,
			)

			const response = await app.request("/api/records?entity_name=campaign", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})

			const data = await response.json()
			expect(response.status).toBe(200)
			expect(data).toHaveProperty("has_next_page")
			expect(data).toHaveProperty("total_size")
			expect(data).toHaveProperty("data")
			expect(Array.isArray(data.data)).toBe(true)

			// Should find test campaign
			const foundCampaign = data.data.find(
				(record: { id: string }) => record.id === campaign.id,
			)
			expect(foundCampaign).toBeTruthy()
			expect(foundCampaign.name).toBe("test_Campaign")
		})

		it("should return record list for sample entity", async () => {
			const testUser = await createTestUser({
				user_name: "sample_entity_test",
				first_name: "Sample",
				last_name: "Entity",
				email: "sample_entity@example.com",
			})
			const token = createValidToken(testUser.id)

			// Create test sample
			const sample = await createTestSample(
				{
					name: "Sample",
				},
				testUser.id,
			)

			const response = await app.request("/api/records?entity_name=sample", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})

			const data = await response.json()
			expect(response.status).toBe(200)
			expect(data).toHaveProperty("has_next_page")
			expect(data).toHaveProperty("total_size")
			expect(data).toHaveProperty("data")
			expect(Array.isArray(data.data)).toBe(true)

			// Should find test sample
			const foundSample = data.data.find(
				(record: { id: string }) => record.id === sample.id,
			)
			expect(foundSample).toBeTruthy()
			expect(foundSample.name).toBe("test_Sample")
		})

		it("should return 401 for missing authorization header", async () => {
			const response = await app.request("/api/records?entity_name=account", {
				method: "GET",
			})

			const data = await response.json()
			expect(response.status).toBe(401)
			expect(data).toEqual({
				message: "No authentication header",
			})
		})

		it("should return 400 for missing entity_name query parameter", async () => {
			const testUser = await createTestUser({
				user_name: "missing_query_user",
				first_name: "Missing",
				last_name: "Query",
				email: "missing_query@example.com",
			})
			const token = createValidToken(testUser.id)

			const response = await app.request("/api/records", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})

			const data = await response.json()
			expect(response.status).toBe(400)
			expect(data.success).toBe(false)
			expect(data.error).toHaveProperty("issues")
			expect(data.error.issues[0].path).toContainEqual("entity_name")
		})

		it("should return 400 for invalid entity_name", async () => {
			const testUser = await createTestUser({
				user_name: "invalid_query_user",
				first_name: "Invalid",
				last_name: "Query",
				email: "invalid_query@example.com",
			})
			const token = createValidToken(testUser.id)

			const response = await app.request(
				"/api/records?entity_name=nonexistent_entity",
				{
					method: "GET",
					headers: {
						Authorization: `Bearer ${token}`,
					},
				},
			)

			const data = await response.json()
			expect(response.status).toBe(400)
			expect(data).toEqual({
				message: "Entity 'nonexistent_entity' does not exist",
			})
		})
	})
})
