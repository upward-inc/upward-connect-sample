import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { app } from "../../index"
import { testPrisma } from "../../test/setup"
import { createExpiredToken, createValidToken } from "../../test/utils/auth"
import { cleanupTestData, createTestUser } from "../../test/utils/common"
import { createTestFile } from "../../test/utils/file"

describe("File Tests", () => {
	beforeAll(async () => {
		// Clean up any existing test data
		await cleanupTestData()
	})

	afterAll(async () => {
		// Clean up all test data including files
		await cleanupTestData()
	})

	describe("POST /api/files - Create File", () => {
		it("should create a file with valid authentication and form data", async () => {
			// Create a test user
			const testUser = await createTestUser({
				user_name: "file_upload_user",
				first_name: "File",
				last_name: "Upload",
				email: "file_upload@example.com",
			})
			const token = createValidToken(testUser.id)

			// Create test file
			const testFile = createTestFile("test.txt", "Hello, World!")
			const formData = new FormData()
			formData.append("file", testFile)

			const response = await app.request("/api/files", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
				},
				body: formData,
			})

			const data = await response.json()
			expect(response.status).toBe(200)
			expect(data).toHaveProperty("id")
			expect(typeof data.id).toBe("string")

			// Verify file was actually saved in database
			const savedFile = await testPrisma.file.findUnique({
				where: { id: data.id },
			})
			expect(savedFile).toBeTruthy()
			expect(savedFile?.name).toBe("test.txt")
			expect(savedFile?.type).toBe("text/plain")
			expect(savedFile?.created_by).toBe(testUser.id)
			expect(savedFile?.modified_by).toBe(testUser.id)
		})

		it("should create a json file", async () => {
			const testUser = await createTestUser({
				user_name: "json_file_user",
				first_name: "Json",
				last_name: "File",
				email: "json_file@example.com",
			})
			const token = createValidToken(testUser.id)

			// Test JSON file
			const jsonFile = createTestFile(
				"data.json",
				JSON.stringify({ message: "test data" }),
				"application/json",
			)
			const formData = new FormData()
			formData.append("file", jsonFile)

			const response = await app.request("/api/files", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
				},
				body: formData,
			})

			const data = await response.json()
			expect(response.status).toBe(200)
			expect(data).toHaveProperty("id")

			// Verify file details
			const savedFile = await testPrisma.file.findUnique({
				where: { id: data.id },
			})
			expect(savedFile?.name).toBe("data.json")
			expect(savedFile?.type).toBe("application/json")
			expect(Buffer.from(savedFile?.content || []).toString()).toEqual(
				JSON.stringify({ message: "test data" }),
			)
		})

		it("should create a binary file", async () => {
			const testUser = await createTestUser({
				user_name: "binary_file_user",
				first_name: "Binary",
				last_name: "File",
				email: "binary_file@example.com",
			})
			const token = createValidToken(testUser.id)

			// Create binary content (simulated image)
			const binaryContent = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]) // PNG header
			const binaryFile = new File([binaryContent], "test.png", {
				type: "image/png",
			})
			const formData = new FormData()
			formData.append("file", binaryFile)

			const response = await app.request("/api/files", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
				},
				body: formData,
			})

			const data = await response.json()
			expect(response.status).toBe(200)
			expect(data).toHaveProperty("id")

			// Verify binary file details
			const savedFile = await testPrisma.file.findUnique({
				where: { id: data.id },
			})
			expect(savedFile?.name).toBe("test.png")
			expect(savedFile?.type).toBe("image/png")
			expect(new Uint8Array(savedFile?.content || [])).toEqual(binaryContent)
		})

		it("should return 401 for missing authorization header", async () => {
			const testFile = createTestFile("unauthorized.txt", "Should not upload")
			const formData = new FormData()
			formData.append("file", testFile)

			const response = await app.request("/api/files", {
				method: "POST",
				body: formData,
			})

			const data = await response.json()
			expect(response.status).toBe(401)
			expect(data).toEqual({
				message: "No authentication header",
			})
		})

		it("should return 400 for invalid authorization header format", async () => {
			const testFile = createTestFile("invalid_auth.txt", "Should not upload")
			const formData = new FormData()
			formData.append("file", testFile)

			const response = await app.request("/api/files", {
				method: "POST",
				headers: {
					Authorization: "InvalidFormat token_here",
				},
				body: formData,
			})

			const data = await response.json()
			expect(response.status).toBe(400)
			expect(data).toEqual({
				message: "Invalid authentication header",
			})
		})

		it("should return 401 for expired token", async () => {
			const testUser = await createTestUser({
				user_name: "expired_token_user",
				first_name: "Expired",
				last_name: "Token",
				email: "expired_token@example.com",
			})
			const expiredToken = createExpiredToken(testUser.id)

			const testFile = createTestFile("expired.txt", "Should not upload")
			const formData = new FormData()
			formData.append("file", testFile)

			const response = await app.request("/api/files", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${expiredToken}`,
				},
				body: formData,
			})

			const data = await response.json()
			expect(response.status).toBe(401)
			expect(data).toEqual({
				message: "Invalid token",
			})
		})

		it("should return 401 for malformed token", async () => {
			const testFile = createTestFile("malformed.txt", "Should not upload")
			const formData = new FormData()
			formData.append("file", testFile)

			const response = await app.request("/api/files", {
				method: "POST",
				headers: {
					Authorization: "Bearer invalid.malformed.token",
				},
				body: formData,
			})

			const data = await response.json()
			expect(response.status).toBe(401)
			expect(data).toEqual({
				message: "Invalid token",
			})
		})

		it("should return 400 for missing file in form data", async () => {
			const testUser = await createTestUser({
				user_name: "no_file_user",
				first_name: "No",
				last_name: "File",
				email: "no_file@example.com",
			})
			const token = createValidToken(testUser.id)

			// Send form data without file
			const formData = new FormData()
			formData.append("other_field", "not a file")

			const response = await app.request("/api/files", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
				},
				body: formData,
			})

			const data = await response.json()
			expect(response.status).toBe(400)
			expect(data.success).toBe(false)
			expect(data.error).toHaveProperty("issues")
			expect(data.error.issues[0]).toMatchObject({
				code: "custom",
				message: "Input not instance of File",
				path: ["file"],
			})
		})

		it("should return 400 for empty form data", async () => {
			const testUser = await createTestUser({
				user_name: "empty_form_user",
				first_name: "Empty",
				last_name: "Form",
				email: "empty_form@example.com",
			})
			const token = createValidToken(testUser.id)

			// Send empty form data
			const formData = new FormData()

			const response = await app.request("/api/files", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
				},
				body: formData,
			})

			const data = await response.json()
			expect(response.status).toBe(400)
			expect(data.success).toBe(false)
			expect(data.error).toHaveProperty("issues")
			expect(data.error.issues[0]).toMatchObject({
				code: "custom",
				message: "Input not instance of File",
				path: ["file"],
			})
		})
	})

	describe("GET /api/files/:id - Get File", () => {
		it("should return file content for valid file ID with authentication", async () => {
			// Create a test user and file
			const testUser = await createTestUser({
				user_name: "get_file_user",
				first_name: "Get",
				last_name: "File",
				email: "get_file@example.com",
			})
			const token = createValidToken(testUser.id)

			// First create a file
			const fileContent = "File content for download"
			const testFile = createTestFile("download.txt", fileContent, "text/plain")
			const formData = new FormData()
			formData.append("file", testFile)

			const createResponse = await app.request("/api/files", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
				},
				body: formData,
			})

			const createData = await createResponse.json()
			expect(createResponse.status).toBe(200)

			// Now get the file
			const getResponse = await app.request(`/api/files/${createData.id}`, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})

			const content = await getResponse.text()
			expect(getResponse.status).toBe(200)
			expect(getResponse.headers.get("Content-Type")).toBe("text/plain")
			expect(content).toBe(fileContent)
		})

		it("should return file content with correct headers for json", async () => {
			const testUser = await createTestUser({
				user_name: "mime_type_user",
				first_name: "Mime",
				last_name: "Type",
				email: "mime_type@example.com",
			})
			const token = createValidToken(testUser.id)

			// Create JSON file
			const jsonContent = JSON.stringify({ test: "data" })
			const jsonFile = createTestFile(
				"data.json",
				jsonContent,
				"application/json",
			)
			const formData = new FormData()
			formData.append("file", jsonFile)

			const createResponse = await app.request("/api/files", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
				},
				body: formData,
			})

			const createData = await createResponse.json()
			expect(createResponse.status).toBe(200)

			// Get the JSON file
			const getResponse = await app.request(`/api/files/${createData.id}`, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})

			const responseContent = await getResponse.text()
			expect(getResponse.status).toBe(200)
			expect(getResponse.headers.get("Content-Type")).toBe("application/json")
			expect(getResponse.headers.get("Content-Length")).toBe(
				jsonContent.length.toString(),
			)
			expect(responseContent).toBe(jsonContent)
		})

		it("should handle binary file downloads correctly", async () => {
			const testUser = await createTestUser({
				user_name: "binary_download_user",
				first_name: "Binary",
				last_name: "Download",
				email: "binary_download@example.com",
			})
			const token = createValidToken(testUser.id)

			// Create binary file
			const binaryContent = new Uint8Array([
				137, 80, 78, 71, 13, 10, 26, 10, 255, 0, 128,
			]) // PNG header
			const binaryFile = new File([binaryContent], "binary.png", {
				type: "image/png",
			})
			const formData = new FormData()
			formData.append("file", binaryFile)

			const createResponse = await app.request("/api/files", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
				},
				body: formData,
			})

			const createData = await createResponse.json()
			expect(createResponse.status).toBe(200)

			// Download the binary file
			const getResponse = await app.request(`/api/files/${createData.id}`, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})

			const arrayBuffer = await getResponse.arrayBuffer()
			const responseBytes = new Uint8Array(arrayBuffer)
			expect(getResponse.status).toBe(200)
			expect(getResponse.headers.get("Content-Type")).toBe("image/png")
			expect(responseBytes).toEqual(binaryContent)
		})

		it("should return 404 for non-existent file ID", async () => {
			const testUser = await createTestUser({
				user_name: "not_found_user",
				first_name: "Not",
				last_name: "Found",
				email: "not_found@example.com",
			})
			const token = createValidToken(testUser.id)
			const nonExistentId = crypto.randomUUID()

			const response = await app.request(`/api/files/${nonExistentId}`, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})

			const data = await response.json()
			expect(response.status).toBe(404)
			expect(data).toEqual({
				message: "File not found",
			})
		})

		it("should return 401 for missing authorization header", async () => {
			const response = await app.request("/api/files/some-id", {
				method: "GET",
			})

			const data = await response.json()
			expect(response.status).toBe(401)
			expect(data).toEqual({
				message: "No authentication header",
			})
		})

		it("should return 401 for expired token", async () => {
			const testUser = await createTestUser({
				user_name: "expired_get_user",
				first_name: "Expired",
				last_name: "Get",
				email: "expired_get@example.com",
			})
			const expiredToken = createExpiredToken(testUser.id)

			const response = await app.request("/api/files/some-id", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${expiredToken}`,
				},
			})

			const data = await response.json()
			expect(response.status).toBe(401)
			expect(data).toEqual({
				message: "Invalid token",
			})
		})

		it("should return 401 for malformed token", async () => {
			const response = await app.request("/api/files/some-id", {
				method: "GET",
				headers: {
					Authorization: "Bearer invalid.malformed.token",
				},
			})

			const data = await response.json()
			expect(response.status).toBe(401)
			expect(data).toEqual({
				message: "Invalid token",
			})
		})
	})
})
