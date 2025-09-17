import type { user } from "@prisma/client"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { seedEntities } from "../../../seed/entity"
import { seedEntityItems } from "../../../seed/entity-item"
import { seedEntityItemOptions } from "../../../seed/entity-item-option"
import { app } from "../../index"
import { testPrisma } from "../../test/integration-setup"
import { createValidToken } from "../../test/integration-utils/auth"
import {
	cleanupTestData,
	createIntegrationTestUser,
} from "../../test/integration-utils/common"
import {
	createIntegrationTestAccount,
	createIntegrationTestLead,
} from "../../test/integration-utils/record"

describe("Record Integration Tests", () => {
	let testLead: { id: string }
	let testAccount: { id: string }

	beforeAll(async () => {
		// Clean up any existing test data
		await cleanupTestData()

		// Create a test user for entity ownership
		const testUser = await createIntegrationTestUser({
			user_name: "record_test_user",
			first_name: "Record",
			last_name: "Test",
			email: "record_test@example.com",
		})

		// Create a test lead for the test user
		testLead = await createIntegrationTestLead({
			company: "Test Company",
			first_name: "Test",
			last_name: "Lead",
			status: "new",
		})

		// Create a test account for the test user
		testAccount = await createIntegrationTestAccount({
			name: "Test Account",
		})

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
			const testUser = await createIntegrationTestUser({
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
			const testUser = await createIntegrationTestUser({
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
						description:
							"This is a test account created during integration testing.",
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
				"This is a test account created during integration testing.",
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
			const testUser = await createIntegrationTestUser({
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
			const testUser = await createIntegrationTestUser({
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
			const testUser = await createIntegrationTestUser({
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
			const testUser = await createIntegrationTestUser({
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
			const testUser = await createIntegrationTestUser({
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
			const testUser = await createIntegrationTestUser({
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
			const testUser = await createIntegrationTestUser({
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
				message: "'name' is required for 'account'",
			})
		})

		it("should return 400 for nonexistent reference", async () => {
			const testUser = await createIntegrationTestUser({
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
			const testUser = await createIntegrationTestUser({
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
			const testUser = await createIntegrationTestUser({
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
			expect(data.message).toBe(
				"Field 'revenue' must be an integer for 'account'",
			)
		})
	})
})
