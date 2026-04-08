import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { app } from "../../../../index"
import { testPrisma } from "../../../../test/setup"
import {
	cleanupEntityMetadata,
	setupEntityMetadata,
} from "../../../../test/utils/entity"
import {
	createTestExecutionUser,
	deleteTestExecutionUser,
	type TestExecutionUser,
} from "../../../../test/utils/execution-user"
import {
	createTestSample,
	deleteAllTestSamples,
} from "../../../../test/utils/record"

describe("DELETE /records/:entity_name/:id - レコード削除", () => {
	// テスト実施ユーザー
	let testExecutionUser: TestExecutionUser

	beforeAll(async () => {
		const taskId = crypto.randomUUID()
		const { user } = await setup(taskId)
		testExecutionUser = user
	})

	afterAll(async () => {
		await cleanup()
	})

	// テストデータのセットアップ
	async function setup(taskId: string) {
		// テスト実施ユーザーの作成
		const user = await createTestExecutionUser({ user_name: taskId })

		// エンティティ関連データの作成
		await setupEntityMetadata(user)

		return { user }
	}

	// テストデータのクリーンアップ
	async function cleanup() {
		await Promise.all([cleanupEntityMetadata(), deleteAllTestSamples()])
		await deleteTestExecutionUser(testExecutionUser.id)
	}

	/**
	 * レコードAPIへのDELETEリクエストを送信する
	 */
	async function requestDelete(
		entityName: string,
		id: string,
		authToken = testExecutionUser.access_token,
	) {
		return await app.request(`/api/v1/records/${entityName}/${id}`, {
			method: "DELETE",
			headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
		})
	}

	it("認証ヘッダーがない場合に401エラーを返すこと", async () => {
		// Act
		const response = await requestDelete("sample", "", "")

		// Assert
		const json = await response.json()
		expect(response.status).toBe(401)
		expect(json).toHaveProperty("message")
	})

	it("リクエストが正常に処理された場合、204ステータスを返すこと", async () => {
		// Arrange
		const target = await createTestSample(testExecutionUser.id, {
			name: "Sample to Delete",
		})

		// Act
		const response = await requestDelete("sample", target.id)

		// Assert
		expect(response.status).toBe(204)
	})

	it("リクエストが正常に処理された場合のレスポンスの構造が正しいこと", async () => {
		// Arrange
		const target = await createTestSample(testExecutionUser.id, {
			name: "Sample to Delete",
		})

		// Act
		const response = await requestDelete("sample", target.id)

		// Assert
		expect(await response.text()).toBe("")
	})

	it("レコードを削除できること", async () => {
		// Arrange
		const target = await createTestSample(testExecutionUser.id, {
			name: "Sample to Delete",
		})

		// Act
		await requestDelete("sample", target.id)

		// Assert
		const record = await testPrisma.sample.findUnique({
			where: { id: target.id },
		})
		expect(record).toBeNull()
	})

	it("存在しないエンティティを指定した場合に404エラーを返すこと", async () => {
		// Act
		const response = await requestDelete(
			"nonexistent_entity",
			crypto.randomUUID(),
		)

		// Assert
		const json = await response.json()
		expect(response.status).toBe(404)
		expect(json).toHaveProperty("message")
	})

	it("存在しないレコードIDを指定した場合に404エラーを返すこと", async () => {
		// Act
		const response = await requestDelete("sample", crypto.randomUUID())

		// Assert
		const json = await response.json()
		expect(response.status).toBe(404)
		expect(json).toHaveProperty("message")
	})
})
