import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { app } from "../../../../index"
import { testPrisma } from "../../../../test/setup"
import { createExpiredToken } from "../../../../test/utils/auth"
import {
	type TestExecutionUser,
	createTestExecutionUser,
	deleteTestExecutionUser,
} from "../../../../test/utils/execution-user"
import { createTestFileInDB } from "../../../../test/utils/file"

describe("GET /api/v1/files/:id - ファイル取得", () => {
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
	 * ファイルAPIへのGETリクエストを送信する
	 */
	async function requestGet(
		fileId: string,
		authToken = testExecutionUser.access_token,
	) {
		return await app.request(`/api/v1/files/${fileId}`, {
			method: "GET",
			headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
		})
	}

	it("有効な認証とファイルIDでテキストファイル内容を取得できること", async () => {
		// Arrange
		const fileContent = "File content for download"
		const file = await createTestFileInDB(
			testExecutionUser.id,
			"download.txt",
			fileContent,
			"text/plain",
		)

		// Act
		const response = await requestGet(file.id)

		// Assert
		const content = await response.text()
		expect(response.status).toBe(200)
		expect(response.headers.get("Content-Type")).toBe("text/plain")
		expect(content).toBe(fileContent)
	})

	it("JSONファイルを正しいヘッダーとともに取得できること", async () => {
		// Arrange
		const jsonContent = JSON.stringify({ test: "data" })
		const file = await createTestFileInDB(
			testExecutionUser.id,
			"data.json",
			jsonContent,
			"application/json",
		)

		// Act
		const response = await requestGet(file.id)

		// Assert
		const responseContent = await response.text()
		expect(response.status).toBe(200)
		expect(response.headers.get("Content-Type")).toBe("application/json")
		expect(response.headers.get("Content-Length")).toBe(
			jsonContent.length.toString(),
		)
		expect(responseContent).toBe(jsonContent)
	})

	it("バイナリファイルを正しくダウンロードできること", async () => {
		// Arrange
		const binaryContent = new Uint8Array([
			137, 80, 78, 71, 13, 10, 26, 10, 255, 0, 128,
		]) // PNG header
		const file = await createTestFileInDB(
			testExecutionUser.id,
			"binary.png",
			binaryContent,
			"image/png",
		)

		// Act
		const response = await requestGet(file.id)

		// Assert
		const arrayBuffer = await response.arrayBuffer()
		const responseBytes = new Uint8Array(arrayBuffer)
		expect(response.status).toBe(200)
		expect(response.headers.get("Content-Type")).toBe("image/png")
		expect(responseBytes).toEqual(binaryContent)
	})

	it("存在しないファイルIDを指定した場合に404エラーを返すこと", async () => {
		// Arrange
		const nonExistentId = crypto.randomUUID()

		// Act
		const response = await requestGet(nonExistentId)

		// Assert
		const json = await response.json()
		expect(response.status).toBe(404)
		expect(json).toHaveProperty("message")
	})

	describe("認証エラーの場合に401エラーを返すこと", () => {
		it.each([
			{
				title: "認証ヘッダーがない",
				tokenBuilder: () => "",
			},
			{
				title: "期限切れトークン",
				tokenBuilder: (userId: string) => createExpiredToken(userId),
			},
			{
				title: "不正なトークン",
				tokenBuilder: () => "invalid.malformed.token",
			},
		])("$title", async ({ tokenBuilder }) => {
			// Arrange
			const token = tokenBuilder(testExecutionUser.id)

			// Act
			const response = await requestGet("some-id", token)

			// Assert
			const json = await response.json()
			expect(response.status).toBe(401)
			expect(json).toHaveProperty("message")
		})
	})
})
