import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { app } from "../../../../index"
import { testPrisma } from "../../../../test/setup"
import { createExpiredToken } from "../../../../test/utils/auth"
import {
	createTestExecutionUser,
	deleteTestExecutionUser,
	type TestExecutionUser,
} from "../../../../test/utils/execution-user"
import { createTestFileInDB } from "../../../../test/utils/file"

describe("GET /api/v1/files - ファイルメタデータ一覧取得", () => {
	// テスト実施ユーザー
	let testExecutionUser: TestExecutionUser

	beforeAll(async () => {
		const taskId = crypto.randomUUID()
		testExecutionUser = await createTestExecutionUser({
			user_name: taskId,
		})
	})

	afterAll(async () => {
		// ファイルデータの削除
		await testPrisma.file.deleteMany({
			where: { created_by: testExecutionUser.id },
		})

		await deleteTestExecutionUser(testExecutionUser.id)
	})

	/**
	 * レコードに紐づくテスト用ファイルを作成する
	 *
	 * `source_record`の保存形式の変更を検出できるよう、`toSourceRecordJson`を使わず意図的にリテラルで直列化する。
	 */
	async function createLinkedTestFile(
		recordEntity: string,
		recordId: string,
		name: string,
		type: string,
	) {
		return await createTestFileInDB(
			testExecutionUser.id,
			name,
			`content of ${name}`,
			type,
			JSON.stringify({ entity_name: recordEntity, id: recordId }),
		)
	}

	/**
	 * ファイルメタデータ一覧APIへのGETリクエストを送信する
	 */
	async function requestGetList(
		query: Record<string, string>,
		authToken = testExecutionUser.access_token,
	) {
		const queryString = new URLSearchParams(query).toString()
		return await app.request(`/api/v1/files?${queryString}`, {
			method: "GET",
			headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
		})
	}

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
			const response = await requestGetList(
				{ record_entity: "account", record_id: crypto.randomUUID() },
				token,
			)

			// Assert
			const json = await response.json()
			expect(response.status).toBe(401)
			expect(json).toHaveProperty("message")
		})
	})

	it("指定したレコードに紐づくファイルのメタデータ一覧を取得できること", async () => {
		// Arrange
		const recordId = crypto.randomUUID()
		const file1 = await createLinkedTestFile(
			"account",
			recordId,
			"photo_001.jpg",
			"image/jpeg",
		)
		const file2 = await createLinkedTestFile(
			"account",
			recordId,
			"photo_002.png",
			"image/png",
		)

		// Act
		const response = await requestGetList({
			record_entity: "account",
			record_id: recordId,
		})

		// Assert
		const json = await response.json()
		expect(response.status).toBe(200)
		expect(json.has_next_page).toBe(false)
		expect(json.total_size).toBe(2)
		expect(json.data).toHaveLength(2)
		expect(json.data).toEqual(
			expect.arrayContaining([
				{ id: file1.id, type: "image/jpeg" },
				{ id: file2.id, type: "image/png" },
			]),
		)
	})

	it("複数回のリクエストで同じ並び順を返すこと", async () => {
		// Arrange
		const recordId = crypto.randomUUID()
		await createLinkedTestFile("account", recordId, "a.jpg", "image/jpeg")
		await createLinkedTestFile("account", recordId, "b.jpg", "image/jpeg")
		await createLinkedTestFile("account", recordId, "c.jpg", "image/jpeg")
		const query = { record_entity: "account", record_id: recordId }

		// Act
		const firstResponse = await requestGetList(query)
		const secondResponse = await requestGetList(query)

		// Assert
		const first = await firstResponse.json()
		const second = await secondResponse.json()
		expect(first.data).toHaveLength(3)
		expect(first.data).toEqual(second.data)
	})

	it("別のレコードに紐づくファイルやレコードに紐づかないファイルが結果に含まれないこと", async () => {
		// Arrange
		const recordId = crypto.randomUUID()
		const targetFile = await createLinkedTestFile(
			"account",
			recordId,
			"target.jpg",
			"image/jpeg",
		)
		// 別レコードIDに紐づくファイル
		await createLinkedTestFile(
			"account",
			crypto.randomUUID(),
			"other-record.jpg",
			"image/jpeg",
		)
		// 同じレコードIDだが別エンティティに紐づくファイル
		await createLinkedTestFile(
			"lead",
			recordId,
			"other-entity.jpg",
			"image/jpeg",
		)
		// レコードに紐づかないファイル
		await createTestFileInDB(
			testExecutionUser.id,
			"unlinked.jpg",
			"content of unlinked.jpg",
			"image/jpeg",
		)

		// Act
		const response = await requestGetList({
			record_entity: "account",
			record_id: recordId,
		})

		// Assert
		const json = await response.json()
		expect(response.status).toBe(200)
		expect(json.total_size).toBe(1)
		expect(json.data).toEqual([{ id: targetFile.id, type: "image/jpeg" }])
	})

	it("紐づくファイルが存在しないレコードを指定した場合に空配列を返すこと", async () => {
		// Act
		const response = await requestGetList({
			record_entity: "account",
			record_id: crypto.randomUUID(),
		})

		// Assert
		const json = await response.json()
		expect(response.status).toBe(200)
		expect(json).toEqual({ has_next_page: false, total_size: 0, data: [] })
	})

	it("limitとoffsetで結果を分割取得できること", async () => {
		// Arrange
		const recordId = crypto.randomUUID()
		await createLinkedTestFile("account", recordId, "p1.jpg", "image/jpeg")
		await createLinkedTestFile("account", recordId, "p2.jpg", "image/jpeg")
		await createLinkedTestFile("account", recordId, "p3.jpg", "image/jpeg")
		const baseQuery = { record_entity: "account", record_id: recordId }

		// Act & Assert
		// 並び順の仕様は「冪等であること」のみのため、全件取得時の並びを基準に分割結果を検証する
		const allResponse = await requestGetList(baseQuery)
		const all = await allResponse.json()
		expect(all.has_next_page).toBe(false)
		expect(all.total_size).toBe(3)
		expect(all.data).toHaveLength(3)

		const firstPageResponse = await requestGetList({
			...baseQuery,
			limit: "2",
		})
		const firstPage = await firstPageResponse.json()
		expect(firstPage.has_next_page).toBe(true)
		expect(firstPage.total_size).toBe(3)
		expect(firstPage.data).toEqual(all.data.slice(0, 2))

		const secondPageResponse = await requestGetList({
			...baseQuery,
			limit: "2",
			offset: "2",
		})
		const secondPage = await secondPageResponse.json()
		expect(secondPage.has_next_page).toBe(false)
		expect(secondPage.total_size).toBe(3)
		expect(secondPage.data).toEqual(all.data.slice(2))
	})

	it("offsetのみを指定した場合に指定件数をスキップした残りの全件を返すこと", async () => {
		// Arrange
		const recordId = crypto.randomUUID()
		await createLinkedTestFile("account", recordId, "o1.jpg", "image/jpeg")
		await createLinkedTestFile("account", recordId, "o2.jpg", "image/jpeg")
		await createLinkedTestFile("account", recordId, "o3.jpg", "image/jpeg")
		const baseQuery = { record_entity: "account", record_id: recordId }

		// Act
		const allResponse = await requestGetList(baseQuery)
		const offsetResponse = await requestGetList({ ...baseQuery, offset: "1" })

		// Assert
		const all = await allResponse.json()
		const offsetResult = await offsetResponse.json()
		expect(offsetResponse.status).toBe(200)
		expect(offsetResult.has_next_page).toBe(false)
		expect(offsetResult.total_size).toBe(3)
		expect(offsetResult.data).toEqual(all.data.slice(1))
	})

	it("limitが総数を超える場合に全件とhas_next_page: falseを返すこと", async () => {
		// Arrange
		const recordId = crypto.randomUUID()
		await createLinkedTestFile("account", recordId, "l1.jpg", "image/jpeg")
		await createLinkedTestFile("account", recordId, "l2.jpg", "image/jpeg")

		// Act
		const response = await requestGetList({
			record_entity: "account",
			record_id: recordId,
			limit: "10",
		})

		// Assert
		const json = await response.json()
		expect(response.status).toBe(200)
		expect(json.has_next_page).toBe(false)
		expect(json.total_size).toBe(2)
		expect(json.data).toHaveLength(2)
	})

	describe("バリデーションエラーの場合に400エラーを返すこと", () => {
		it.each<{ title: string; query: Record<string, string> }>([
			{
				title: "record_entityがない",
				query: { record_id: crypto.randomUUID() },
			},
			{
				title: "record_idがない",
				query: { record_entity: "account" },
			},
			{
				title: "limitが0",
				query: {
					record_entity: "account",
					record_id: crypto.randomUUID(),
					limit: "0",
				},
			},
			{
				title: "limitが数値でない",
				query: {
					record_entity: "account",
					record_id: crypto.randomUUID(),
					limit: "abc",
				},
			},
			{
				title: "offsetが負数",
				query: {
					record_entity: "account",
					record_id: crypto.randomUUID(),
					offset: "-1",
				},
			},
		])("$title", async ({ query }) => {
			// Act
			const response = await requestGetList(query)

			// Assert
			const json = await response.json()
			expect(response.status).toBe(400)
			expect(json).toHaveProperty("message")
		})
	})
})
