import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { app } from "../../../../index"
import { testPrisma } from "../../../../test/setup"
import {
	cleanupEntityMetadata,
	setupEntityMetadata,
} from "../../../../test/utils/entity"
import {
	type TestExecutionUser,
	createTestExecutionUser,
	deleteTestExecutionUser,
} from "../../../../test/utils/execution-user"
import {
	createTestAccount,
	createTestLead,
	createTestSample,
	deleteAllTestSamples,
	deleteTestAccountsByPrefix,
	deleteTestLeadsByPrefix,
} from "../../../../test/utils/record"

type RecordReference = {
	entity_name: string
	id: string
}

describe("PATCH /records/:entity_name/:id - レコード更新", () => {
	// テスト実施ユーザー
	let testExecutionUser: TestExecutionUser

	// テストデータ（参照先用）
	let accountRecordReference: RecordReference
	let leadRecordReference: RecordReference

	beforeAll(async ({ id: taskId }) => {
		const { user, account, lead } = await setup(taskId)
		testExecutionUser = user
		accountRecordReference = { entity_name: "account", id: account.id }
		leadRecordReference = { entity_name: "lead", id: lead.id }
	})

	afterAll(async ({ id: taskId }) => {
		await cleanup(taskId)
	})

	// テストデータのセットアップ
	async function setup(taskId: string) {
		// テスト実施ユーザーの作成
		const user = await createTestExecutionUser({ user_name: taskId })

		// エンティティ関連データの作成
		await setupEntityMetadata(user)

		// 取引先データの作成（参照用）
		const account = await createTestAccount(user.id, {
			name: `${taskId}_1`,
		})

		// リードデータの作成（参照用）
		const lead = await createTestLead(user.id, {
			company: `${taskId}_1`,
			first_name: "Test",
			last_name: "Lead",
		})

		return { user, account, lead }
	}

	// テストデータのクリーンアップ
	async function cleanup(taskId: string) {
		await Promise.all([
			deleteTestAccountsByPrefix(`${taskId}_`),
			deleteTestLeadsByPrefix(`${taskId}_`),
			deleteAllTestSamples(),
			cleanupEntityMetadata(),
		])

		await deleteTestExecutionUser(testExecutionUser.id)
	}

	/**
	 * レコードAPIへのPATCHリクエストを送信する
	 */
	async function requestPatch(
		entityName: string,
		id: string,
		body: unknown,
		authToken = testExecutionUser.access_token,
	) {
		return await app.request(`/api/v1/records/${entityName}/${id}`, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
			},
			body: typeof body === "string" ? body : JSON.stringify(body),
		})
	}

	it("認証ヘッダーがない場合に401エラーを返すこと", async () => {
		// Act
		const response = await requestPatch("sample", "", {}, "")

		// Assert
		const json = await response.json()
		expect(response.status).toBe(401)
		expect(json).toHaveProperty("message")
	})

	it("リクエストが正常に処理された場合、200ステータスを返すこと", async () => {
		// Arrange
		const sample = await createTestSample(testExecutionUser.id, {
			name: "Test Sample",
		})

		// Act
		const response = await requestPatch("sample", sample.id, {
			name: "Updated Sample",
		})

		// Assert
		expect(response.status).toBe(200)
	})

	it("リクエストが正常に処理された場合のレスポンスの構造が正しいこと", async () => {
		// Arrange
		const sample = await createTestSample(testExecutionUser.id, {
			name: "Test Sample",
		})

		// Act
		const response = await requestPatch("sample", sample.id, {
			name: "Updated Sample",
		})

		// Assert
		const { id } = await response.json()
		expect(typeof id).toBe("string")
		expect(id).toBe(sample.id)
	})

	it("すべての項目タイプを含むレコードを更新できること", async () => {
		// Arrange
		const sample = await createTestSample(testExecutionUser.id, {
			name: "Original Sample",
			text: "Original Text",
		})

		// Act
		const response = await requestPatch("sample", sample.id, {
			name: "Updated Sample",
			text: "更新後のテキスト",
			textarea: "更新後のテキストエリア",
			phone_number: "090-1234-5678",
			email: "updated@example.com",
			url: "https://updated.example.com",
			combobox: "updated_combobox",
			integer: 999,
			decimal: 123.45,
			boolean: false,
			date: "2025-12-31",
			datetime: "2025-12-31T23:59:59Z",
			time: "23:59:59",
			option_single: "option2",
			option_multi: ["option2", "option3"],
			reference_single_target_single_id: accountRecordReference,
			reference_single_target_multi_id: [accountRecordReference],
			reference_multi_target_single_id: accountRecordReference,
			reference_multi_target_multi_id: [
				accountRecordReference,
				leadRecordReference,
			],
			address_zipcode: "1000001",
			address_prefecture: "東京都",
			address_municipality: "千代田区",
			address_street: "千代田1-1",
			latitude: 35.6938403,
			longitude: 139.7535965,
		})

		// Assert
		const json = await response.json()
		const record = await testPrisma.sample.findUnique({
			where: { id: json.id },
		})
		expect(record).not.toBeNull()
		expect(record?.name).toBe("Updated Sample")
		expect(record?.text).toBe("更新後のテキスト")
		expect(record?.textarea).toBe("更新後のテキストエリア")
		expect(record?.phone_number).toBe("090-1234-5678")
		expect(record?.email).toBe("updated@example.com")
		expect(record?.url).toBe("https://updated.example.com")
		expect(record?.combobox).toBe("updated_combobox")
		expect(record?.integer?.toNumber()).toBe(999)
		expect(record?.decimal?.toNumber()).toBe(123.45)
		expect(record?.boolean).toBe(false)
		expect(record?.date).toStrictEqual(new Date("2025-12-31"))
		expect(record?.datetime).toStrictEqual(new Date("2025-12-31T23:59:59Z"))
		expect(record?.time).toStrictEqual(new Date("1970-01-01T23:59:59Z"))
		expect(record?.option_single).toBe(JSON.stringify(["option2"]))
		expect(record?.option_multi).toBe(JSON.stringify(["option2", "option3"]))
		expect(record?.reference_single_target_single_id).toBe(
			JSON.stringify(accountRecordReference),
		)
		expect(record?.reference_single_target_multi_id).toBe(
			JSON.stringify([accountRecordReference]),
		)
		expect(record?.reference_multi_target_single_id).toBe(
			JSON.stringify(accountRecordReference),
		)
		expect(record?.reference_multi_target_multi_id).toBe(
			JSON.stringify([accountRecordReference, leadRecordReference]),
		)
		expect(record?.address_zipcode).toBe("1000001")
		expect(record?.address_prefecture).toBe("東京都")
		expect(record?.address_municipality).toBe("千代田区")
		expect(record?.address_street).toBe("千代田1-1")

		// 位置情報の確認
		const locationRecord = await testPrisma.$queryRawUnsafe<
			{ latitude: number; longitude: number }[]
		>(
			`
			SELECT
				[location].Lat AS latitude,
				[location].Long AS longitude
			FROM [sample]
			WHERE id = '${record?.id}'
		`,
		)
		expect(locationRecord.length).toBe(1)
		expect(locationRecord[0].latitude).toBe(35.6938403)
		expect(locationRecord[0].longitude).toBe(139.7535965)
	})

	it("一部の項目のみ更新できること", async () => {
		// Arrange
		const sample = await createTestSample(testExecutionUser.id, {
			name: "Original Name",
			text: "Original Text",
			integer: 100,
			boolean: true,
		})

		// Act
		const response = await requestPatch("sample", sample.id, {
			text: "Updated Text Only",
		})

		// Assert
		const json = await response.json()
		const record = await testPrisma.sample.findUnique({
			where: { id: json.id },
		})
		expect(record).not.toBeNull()
		expect(record?.name).toBe("Original Name") // 変更されていない
		expect(record?.text).toBe("Updated Text Only") // 変更された
		expect(record?.integer?.toNumber()).toBe(100) // 変更されていない
		expect(record?.boolean).toBe(true) // 変更されていない
	})

	it("更新時に指定不可能な項目（is_updatable: false）を無視すること", async () => {
		// Arrange
		const sample = await createTestSample(testExecutionUser.id, {
			name: "Original Name",
		})
		const originalId = sample.id
		const originalOwner = sample.owner
		const someId = crypto.randomUUID()
		const someOwnerReference = {
			entity_name: "user",
			id: crypto.randomUUID(),
		}

		// Act
		const response = await requestPatch("sample", sample.id, {
			name: "Updated Name",
			id: someId,
			owner: someOwnerReference,
		})

		// Assert
		const json = await response.json()
		const record = await testPrisma.sample.findUnique({
			where: { id: json.id },
		})
		expect(record).not.toBeNull()
		expect(record?.id).toBe(originalId) // IDは変更されない
		expect(record?.owner).toBe(originalOwner) // ownerは変更されない
		expect(record?.name).toBe("Updated Name") // nameは変更される
	})

	it("未知の項目を指定してもエラーにならないこと", async () => {
		// Arrange
		const sample = await createTestSample(testExecutionUser.id, {
			name: "Original Name",
		})

		// Act
		const response = await requestPatch("sample", sample.id, {
			name: "Updated Name",
			unknown_field: "should be ignored",
		})

		// Assert
		const json = await response.json()
		const record = await testPrisma.sample.findUnique({
			where: { id: json.id },
		})
		expect(record).not.toBeNull()
		expect(record?.name).toBe("Updated Name")
	})

	it("日時型の項目に対して、タイムゾーンが含まれる文字列を正常に扱えること", async () => {
		// Arrange
		const sampleUtc = await createTestSample(testExecutionUser.id, {
			name: "Sample UTC",
			datetime: "2025-01-01T00:00:00Z",
		})
		const sampleAsiaTokyo = await createTestSample(testExecutionUser.id, {
			name: "Sample Asia/Tokyo",
			datetime: "2025-01-01T00:00:00Z",
		})
		const sampleLosAngeles = await createTestSample(testExecutionUser.id, {
			name: "Sample Los Angeles",
			datetime: "2025-01-01T00:00:00Z",
		})

		// Act
		const responseUtc = await requestPatch("sample", sampleUtc.id, {
			datetime: "2025-01-01T05:00:00Z",
		})
		const responseAsiaTokyo = await requestPatch("sample", sampleAsiaTokyo.id, {
			datetime: "2025-01-01T14:00:00+09:00",
		})
		const responseLosAngeles = await requestPatch(
			"sample",
			sampleLosAngeles.id,
			{
				datetime: "2024-12-31T21:00:00-08:00",
			},
		)

		// Assert
		const dataUtc = await responseUtc.json()
		const dataAsiaTokyo = await responseAsiaTokyo.json()
		const dataLosAngeles = await responseLosAngeles.json()
		const recordWithUtc = await testPrisma.sample.findUnique({
			where: { id: dataUtc.id },
		})
		const recordWithAsiaTokyo = await testPrisma.sample.findUnique({
			where: { id: dataAsiaTokyo.id },
		})
		const recordWithLosAngeles = await testPrisma.sample.findUnique({
			where: { id: dataLosAngeles.id },
		})

		expect(recordWithUtc).not.toBeNull()
		expect(recordWithAsiaTokyo).not.toBeNull()
		expect(recordWithLosAngeles).not.toBeNull()
		expect(recordWithUtc?.datetime).toStrictEqual(recordWithAsiaTokyo?.datetime)
		expect(recordWithUtc?.datetime).toStrictEqual(
			recordWithLosAngeles?.datetime,
		)
	})

	it("nullを指定して項目の値をクリアできること", async () => {
		// Arrange
		const sample = await createTestSample(testExecutionUser.id, {
			name: "Sample with Values",
			text: "Some Text",
			integer: 123,
			boolean: true,
		})

		// Act
		const response = await requestPatch("sample", sample.id, {
			text: null,
			integer: null,
			boolean: null,
		})

		// Assert
		const json = await response.json()
		const record = await testPrisma.sample.findUnique({
			where: { id: json.id },
		})
		expect(record).not.toBeNull()
		expect(record?.text).toBeNull()
		expect(record?.integer).toBeNull()
		expect(record?.boolean).toBeNull()
	})

	it("存在しないエンティティを指定した場合に404エラーを返すこと", async () => {
		// Act
		const response = await requestPatch(
			"nonexistent_entity",
			crypto.randomUUID(),
			{ name: "Test" },
		)

		// Assert
		const json = await response.json()
		expect(response.status).toBe(404)
		expect(json).toHaveProperty("message")
	})

	it("存在しないレコードIDを指定した場合に404エラーを返すこと", async () => {
		// Act
		const response = await requestPatch("sample", crypto.randomUUID(), {
			name: "Test",
		})

		// Assert
		const json = await response.json()
		expect(response.status).toBe(404)
		expect(json).toHaveProperty("message")
	})

	describe("更新対象のフィールドが含まれていない場合でも200ステータスを返すこと", () => {
		it.each([
			{
				title: "空のJSONオブジェクト",
				body: {},
			},
			{
				title: "有効なフィールドが含まれていない",
				body: { unknown_field: "test" },
			},
		])("$title", async ({ body }) => {
			// Arrange
			const sample = await createTestSample(testExecutionUser.id, {
				name: "Test Sample",
			})

			// Act
			const response = await requestPatch("sample", sample.id, body)

			// Assert
			expect(response.status).toBe(200)
		})
	})

	describe("リクエストボディのバリデーションに失敗する場合に400エラーを返すこと", () => {
		it.each([
			{
				title: "JSONオブジェクトでない",
				body: "Invalid JSON Body",
			},
			{
				title: "必須項目がnull",
				body: { name: null },
			},
		])("$title", async ({ body }) => {
			// Arrange
			const sample = await createTestSample(testExecutionUser.id, {
				name: "Test Sample",
			})

			// Act
			const response = await requestPatch("sample", sample.id, body)

			// Assert
			const json = await response.json()
			expect(response.status).toBe(400)
			expect(json).toHaveProperty("message")
		})

		describe("無効なデータ型", () => {
			it.each([
				{
					title: "文字列に対して数値を指定",
					field: "text",
					value: 1,
				},
				{
					title: "文字列に対して真偽値を指定",
					field: "text",
					value: true,
				},
				{
					title: "文字列に対して配列を指定",
					field: "text",
					value: ["test1", "test2"],
				},
				{
					title: "文字列に対してオブジェクトを指定",
					field: "text",
					value: { test: "test" },
				},
				{
					title: "数値に対して文字列を指定",
					field: "integer",
					value: "invalid-integer",
				},
				{
					title: "数値に対して真偽値を指定",
					field: "integer",
					value: true,
				},
				{
					title: "数値に対して配列を指定",
					field: "integer",
					value: [1, 2],
				},
				{
					title: "数値に対してオブジェクトを指定",
					field: "integer",
					value: { test: 1 },
				},
				{
					title: "真偽値に対して文字列を指定",
					field: "boolean",
					value: "invalid-boolean",
				},
				{
					title: "真偽値に対して数値を指定",
					field: "boolean",
					value: 1,
				},
				{
					title: "真偽値に対して配列を指定",
					field: "boolean",
					value: [true, false],
				},
				{
					title: "真偽値に対してオブジェクトを指定",
					field: "boolean",
					value: { test: true },
				},
			])("$title", async ({ field, value }) => {
				// Arrange
				const sample = await createTestSample(testExecutionUser.id, {
					name: "Test Sample",
				})

				// Act
				const response = await requestPatch("sample", sample.id, {
					[field]: value,
				})

				// Assert
				const json = await response.json()
				expect(response.status).toBe(400)
				expect(json).toHaveProperty("message")
			})
		})

		describe("不正な日付文字列", () => {
			it.each([
				{
					title: "日付ではない文字列",
					field: "date",
					value: "invalid-date-string",
				},
				{
					title: "有効範囲外の日付文字列",
					field: "date",
					value: "2025-01-32",
				},
				{
					title: "時刻ではない文字列",
					field: "time",
					value: "invalid-time-string",
				},
				{
					title: "有効範囲外の時刻文字列",
					field: "time",
					value: "24:00:00",
				},
				{
					title: "日時ではない文字列",
					field: "datetime",
					value: "invalid-datetime-string",
				},
				{
					title: "有効範囲外の日時文字列",
					field: "datetime",
					value: "2025-01-01T24:00:00Z",
				},
			])("$title", async ({ field, value }) => {
				// Arrange
				const sample = await createTestSample(testExecutionUser.id, {
					name: "Test Sample",
				})

				// Act
				const response = await requestPatch("sample", sample.id, {
					[field]: value,
				})

				// Assert
				const json = await response.json()
				expect(response.status).toBe(400)
				expect(json).toHaveProperty("message")
			})
		})

		describe("不正な数値", () => {
			it.each([
				{
					title: "整数ではない数値",
					field: "integer",
					value: 12.34,
				},
			])("$title", async ({ field, value }) => {
				// Arrange
				const sample = await createTestSample(testExecutionUser.id, {
					name: "Test Sample",
				})

				// Act
				const response = await requestPatch("sample", sample.id, {
					[field]: value,
				})

				// Assert
				const json = await response.json()
				expect(response.status).toBe(400)
				expect(json).toHaveProperty("message")
			})
		})

		describe("無効な選択肢", () => {
			it.each([
				{
					title: "単一選択",
					field: "option_single",
					value: "invalid_option",
				},
				{
					title: "複数選択",
					field: "option_multi",
					value: ["option1", "invalid_option"],
				},
			])("$title", async ({ field, value }) => {
				// Arrange
				const sample = await createTestSample(testExecutionUser.id, {
					name: "Test Sample",
				})

				// Act
				const response = await requestPatch("sample", sample.id, {
					[field]: value,
				})

				// Assert
				const json = await response.json()
				expect(response.status).toBe(400)
				expect(json).toHaveProperty("message")
			})
		})

		describe("無効な参照先", () => {
			it.each([
				{
					title: "単一参照先",
					field: "reference_single_target_single_id", // 参照先: account
					getValue: (reference: RecordReference) => reference,
				},
				{
					title: "複数参照先",
					field: "reference_single_target_multi_id", // 参照先: account
					getValue: (reference: RecordReference) => [
						accountRecordReference,
						reference,
					],
				},
			])("$title", async ({ field, getValue }) => {
				// Arrange
				const sample = await createTestSample(testExecutionUser.id, {
					name: "Test Sample",
				})
				const invalidReference = leadRecordReference

				// Act
				const response = await requestPatch("sample", sample.id, {
					[field]: getValue(invalidReference),
				})

				// Assert
				const json = await response.json()
				expect(response.status).toBe(400)
				expect(json).toHaveProperty("message")
			})
		})

		describe("存在しない参照先", () => {
			it.each([
				{
					title: "単一参照先",
					field: "reference_single_target_single_id", // 参照先: account
					getValue: (reference: RecordReference) => reference,
				},
				{
					title: "複数参照先",
					field: "reference_single_target_multi_id", // 参照先: account
					getValue: (reference: RecordReference) => [
						accountRecordReference,
						reference,
					],
				},
			])("$title", async ({ field, getValue }) => {
				// Arrange
				const sample = await createTestSample(testExecutionUser.id, {
					name: "Test Sample",
				})
				const nonExistentReference = {
					entity_name: "account",
					id: crypto.randomUUID(),
				}

				// Act
				const response = await requestPatch("sample", sample.id, {
					[field]: getValue(nonExistentReference),
				})

				// Assert
				const json = await response.json()
				expect(response.status).toBe(400)
				expect(json).toHaveProperty("message")
			})
		})
	})
})
