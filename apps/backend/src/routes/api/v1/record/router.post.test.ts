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
	createTestAccount,
	createTestLead,
	deleteAllTestSamples,
	deleteTestAccountsByPrefix,
	deleteTestLeadsByPrefix,
} from "../../../../test/utils/record"

type RecordReference = {
	entity_name: string
	id: string
}

describe("POST /records/:entity_name - レコード作成", () => {
	const taskId = crypto.randomUUID()
	// テスト実施ユーザー
	let testExecutionUser: TestExecutionUser

	// テストデータ（参照先用）
	let accountRecordReference: RecordReference
	let leadRecordReference: RecordReference

	beforeAll(async () => {
		const { user, account, lead } = await setup(taskId)
		testExecutionUser = user
		accountRecordReference = { entity_name: "account", id: account.id }
		leadRecordReference = { entity_name: "lead", id: lead.id }
	})

	afterAll(async () => {
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
	 * レコードAPIへのPOSTリクエストを送信する
	 */
	async function requestPost(
		entityName: string,
		body: unknown,
		authToken = testExecutionUser.access_token,
	) {
		return await app.request(`/api/v1/records/${entityName}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
			},
			body: typeof body === "string" ? body : JSON.stringify(body),
		})
	}

	it("認証ヘッダーがない場合に401エラーを返すこと", async () => {
		// Act
		const response = await requestPost("sample", { name: "Test" }, "")

		// Assert
		const json = await response.json()
		expect(response.status).toBe(401)
		expect(json).toHaveProperty("message")
	})

	it("リクエストが正常に処理された場合、201ステータスを返すこと", async () => {
		// Act
		const response = await requestPost("sample", { name: "Test" })

		// Assert
		expect(response.status).toBe(201)
	})

	it("リクエストが正常に処理された場合のレスポンスの構造が正しいこと", async () => {
		// Act
		const response = await requestPost("sample", { name: "Test" })

		// Assert
		const { id } = await response.json()
		expect(typeof id).toBe("string")
	})

	it("必須項目のみでレコードを作成できること", async () => {
		// Act
		const response = await requestPost("sample", {
			name: "Required Fields Only",
		})

		// Assert
		const json = await response.json()
		const record = await testPrisma.sample.findUnique({
			where: { id: json.id },
		})
		expect(record).not.toBeNull()
		expect(record?.name).toBe("Required Fields Only")
	})

	it("すべての項目タイプを含むレコードを作成できること", async () => {
		// Act
		const response = await requestPost("sample", {
			name: "All Fields",
			text: "テキスト値",
			textarea: "テキストエリア値",
			phone_number: "03-1234-5678",
			email: "test@example.com",
			url: "https://example.com",
			combobox: "combobox",
			integer: 100,
			decimal: 99.99,
			boolean: true,
			date: "2025-01-01",
			datetime: "2025-01-01T12:00:00Z",
			time: "12:00:00",
			option_single: "option1",
			option_multi: ["option1", "option2"],
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
		expect(record?.name).toBe("All Fields")
		expect(record?.text).toBe("テキスト値")
		expect(record?.textarea).toBe("テキストエリア値")
		expect(record?.phone_number).toBe("03-1234-5678")
		expect(record?.email).toBe("test@example.com")
		expect(record?.url).toBe("https://example.com")
		expect(record?.combobox).toBe("combobox")
		expect(record?.integer?.toNumber()).toBe(100)
		expect(record?.decimal?.toNumber()).toBe(99.99)
		expect(record?.boolean).toBe(true)
		expect(record?.date).toStrictEqual(new Date("2025-01-01"))
		expect(record?.datetime).toStrictEqual(new Date("2025-01-01T12:00:00Z"))
		expect(record?.time).toStrictEqual(new Date("1970-01-01T12:00:00Z")) // 日付部分を管理していないため、Date型では`1970-01-01`になる
		expect(record?.option_single).toBe(JSON.stringify(["option1"]))
		expect(record?.option_multi).toBe(JSON.stringify(["option1", "option2"]))
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

	it("作成時に指定不可能な項目（is_creatable: false）を無視すること", async () => {
		// Arrange
		const someId = crypto.randomUUID()
		const someOwnerReference = {
			entity_name: "user",
			id: crypto.randomUUID(),
		}

		// Act
		const response = await requestPost("sample", {
			name: "Test Ignore ID",
			id: someId,
			owner: someOwnerReference,
		})

		// Assert
		const json = await response.json()
		const record = await testPrisma.sample.findUnique({
			where: { id: json.id },
		})
		expect(record).not.toBeNull()
		expect(record?.id).not.toBe(someId)
		expect(record?.owner).not.toBe(JSON.stringify(someOwnerReference))
	})

	it("未知の項目を指定してもエラーにならないこと", async () => {
		// Act
		const response = await requestPost("sample", {
			name: "Test Unknown Field",
			unknown_field: "should be ignored",
		})

		// Assert
		const json = await response.json()
		const record = await testPrisma.sample.findUnique({
			where: { id: json.id },
		})
		expect(record).not.toBeNull()
	})

	it("日時型の項目に対して、タイムゾーンが含まれる文字列を正常に扱えること", async () => {
		// Act
		const responseUtc = await requestPost("sample", {
			name: "Test UTC Timezone String",
			datetime: "2025-01-01T05:00:00Z",
		})

		const responseAsiaTokyo = await requestPost("sample", {
			name: "Test Asia/Tokyo Timezone String",
			datetime: "2025-01-01T14:00:00+09:00",
		})

		const responseLosAngeles = await requestPost("sample", {
			name: "Test America/Los_Angeles Timezone String",
			datetime: "2024-12-31T21:00:00-08:00",
		})

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

	it("存在しないエンティティを指定した場合に404エラーを返すこと", async () => {
		// Act
		const response = await requestPost("nonexistent_entity", { name: "Test" })

		// Assert
		const json = await response.json()
		expect(response.status).toBe(404)
		expect(json).toHaveProperty("message")
	})

	describe("リクエストボディのバリデーションに失敗する場合に400エラーを返すこと", () => {
		it.each([
			{
				title: "JSONオブジェクトでない",
				entity_name: "sample",
				body: "Invalid JSON Body",
			},
			{
				title: "空のJSONオブジェクト",
				entity_name: "sample",
				body: {},
			},
			{
				title: "有効なフィールドが含まれていない",
				entity_name: "sample",
				body: { unknown_field: "test" },
			},
			{
				title: "必須項目が不足",
				entity_name: "sample",
				body: { text: "テキスト値" },
			},
		])("$title", async ({ entity_name, body }) => {
			// Act
			const response = await requestPost(entity_name, body)

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
				// Act
				const response = await requestPost("sample", {
					name: "Test Invalid Type Value",
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
				// Act
				const response = await requestPost("sample", {
					name: "Test Invalid Date String",
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
				// Act
				const response = await requestPost("sample", {
					name: "Test Invalid Number",
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
				// Act
				const response = await requestPost("sample", {
					name: "Test Invalid Option",
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
				const invalidReference = leadRecordReference

				// Act
				const response = await requestPost("sample", {
					name: "Test Invalid Reference",
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
				const nonExistentReference = {
					entity_name: "account",
					id: crypto.randomUUID(),
				}

				// Act
				const response = await requestPost("sample", {
					name: "Test Non Existent Reference",
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
