import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { app } from "../../../../index"
import { testPrisma } from "../../../../test/setup"
import { createExpiredToken } from "../../../../test/utils/auth"
import {
	type TestExecutionUser,
	createTestExecutionUser,
	deleteTestExecutionUser,
} from "../../../../test/utils/execution-user"
import { createTestFile } from "../../../../test/utils/file"

describe("POST /api/v1/files - ファイル作成", () => {
	// テスト実施ユーザー
	let testExecutionUser: TestExecutionUser

	beforeAll(async ({ id: taskId }) => {
		const { user } = await setup(taskId)
		testExecutionUser = user
	})

	afterAll(async () => {
		await cleanup()
	})

	// テストデータのセットアップ
	async function setup(taskId: string) {
		// テスト実施ユーザーの作成
		const user = await createTestExecutionUser({
			user_name: taskId,
		})

		return { user }
	}

	// テストデータのクリーンアップ
	async function cleanup() {
		// ファイルデータの削除
		await testPrisma.file.deleteMany({
			where: { created_by: testExecutionUser.id },
		})

		await deleteTestExecutionUser(testExecutionUser.id)
	}

	/**
	 * ファイルAPIへのPOSTリクエストを送信する
	 */
	async function requestPost(
		formData: FormData,
		authToken = testExecutionUser.access_token,
	) {
		return await app.request("/api/v1/files", {
			method: "POST",
			headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
			body: formData,
		})
	}

	describe("認証エラーの場合に適切なエラーを返すこと", () => {
		it.each([
			{
				title: "認証ヘッダーがない場合",
				tokenBuilder: () => "",
				expectedStatus: 401,
			},
			{
				title: "認証ヘッダーの形式が不正な場合",
				tokenBuilder: () => "InvalidFormat token_here",
				expectedStatus: 400,
			},
			{
				title: "期限切れトークンの場合",
				tokenBuilder: (userId: string) => createExpiredToken(userId),
				expectedStatus: 401,
			},
			{
				title: "不正なトークンの場合",
				tokenBuilder: () => "invalid.malformed.token",
				expectedStatus: 401,
			},
		])("$title", async ({ tokenBuilder, expectedStatus }) => {
			// Arrange
			const token = tokenBuilder(testExecutionUser.id)
			const testFile = createTestFile("test.txt", "Should not upload")
			const formData = new FormData()
			formData.append("file", testFile)

			// Act
			const response = await requestPost(formData, token)

			// Assert
			const json = await response.json()
			expect(response.status).toBe(expectedStatus)
			expect(json).toHaveProperty("message")
		})
	})

	it("有効な認証とフォームデータでファイルを作成できること", async () => {
		// Arrange
		const testFile = createTestFile("test.txt", "Hello, World!")
		const formData = new FormData()
		formData.append("file", testFile)

		// Act
		const response = await requestPost(formData)

		// Assert
		const data = await response.json()
		expect(response.status).toBe(201)
		expect(data).toHaveProperty("id")
		expect(typeof data.id).toBe("string")
	})

	it("作成したファイルがデータベースに保存されること", async () => {
		// Arrange
		const testFile = createTestFile("test.txt", "Hello, World!")
		const formData = new FormData()
		formData.append("file", testFile)

		// Act
		const response = await requestPost(formData)
		const data = await response.json()

		// Assert
		const savedFile = await testPrisma.file.findUnique({
			where: { id: data.id },
		})
		expect(savedFile).toBeTruthy()
		expect(savedFile?.name).toBe("test.txt")
		expect(savedFile?.type).toBe("text/plain")
		expect(savedFile?.created_by).toBe(testExecutionUser.id)
		expect(savedFile?.modified_by).toBe(testExecutionUser.id)
	})

	it("JSONファイルを作成できること", async () => {
		// Arrange
		const jsonContent = JSON.stringify({ message: "test data" })
		const jsonFile = createTestFile(
			"data.json",
			jsonContent,
			"application/json",
		)
		const formData = new FormData()
		formData.append("file", jsonFile)

		// Act
		const response = await requestPost(formData)

		// Assert
		const data = await response.json()
		expect(response.status).toBe(201)
		expect(data).toHaveProperty("id")

		const savedFile = await testPrisma.file.findUnique({
			where: { id: data.id },
		})
		expect(savedFile?.name).toBe("data.json")
		expect(savedFile?.type).toBe("application/json")
		expect(Buffer.from(savedFile?.content || []).toString()).toEqual(
			jsonContent,
		)
	})

	it("バイナリファイルを作成できること", async () => {
		// Arrange
		const binaryContent = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]) // PNG header
		const binaryFile = new File([binaryContent], "test.png", {
			type: "image/png",
		})
		const formData = new FormData()
		formData.append("file", binaryFile)

		// Act
		const response = await requestPost(formData)

		// Assert
		const data = await response.json()
		expect(response.status).toBe(201)
		expect(data).toHaveProperty("id")

		const savedFile = await testPrisma.file.findUnique({
			where: { id: data.id },
		})
		expect(savedFile?.name).toBe("test.png")
		expect(savedFile?.type).toBe("image/png")
		expect(new Uint8Array(savedFile?.content || [])).toEqual(binaryContent)
	})

	describe("バリデーションエラーの場合に400エラーを返すこと", () => {
		it.each([
			{
				title: "フォームデータにファイルがない場合",
				formDataBuilder: () => {
					const formData = new FormData()
					formData.append("other_field", "not a file")
					return formData
				},
			},
			{
				title: "フォームデータが空の場合",
				formDataBuilder: () => new FormData(),
			},
		])("$title", async ({ formDataBuilder }) => {
			// Arrange
			const formData = formDataBuilder()

			// Act
			const response = await requestPost(formData)

			// Assert
			const json = await response.json()
			expect(response.status).toBe(400)
			expect(json).toHaveProperty("message")
		})
	})
})
