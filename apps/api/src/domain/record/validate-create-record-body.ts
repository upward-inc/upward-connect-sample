import { JsonObjectSchema } from "../../schema/common"
import type { EntityItem } from "../../schema/entity-item"
import type { PostRecordBody } from "../../schema/record"
import { getEntityItemList } from "../entity"
import {
	type ValidateFieldValueResult,
	type ValidateFieldValueResultSuccess,
	validateFieldValue,
} from "./validate-field-value"

export type ValidateCreateRecordBodyResult =
	| ValidateCreateRecordBodyResultSuccess
	| ValidateCreateRecordBodyResultFailure

export interface ValidateCreateRecordBodyResultSuccess {
	success: true
	fields: {
		entityItem: EntityItem
		result: ValidateFieldValueResultSuccess
	}[]
}

export interface ValidateCreateRecordBodyResultFailure {
	success: false
	message: string
}

export const validateCreateRecordBody = async (
	entity_name: string,
	data: PostRecordBody,
): Promise<ValidateCreateRecordBodyResult> => {
	// JSONオブジェクトであることの検証（変換）
	const jsonData = JsonObjectSchema.parse(data)

	const entityItems = await getEntityItemList(entity_name)

	// レコード作成時に入力が必須である項目一覧
	const requiredFields = entityItems.filter((item) => {
		return item.is_required && item.is_creatable
	})

	// 入力がない必須項目一覧
	const missingRequiredFields = requiredFields.filter((field) => {
		return !data[field.name]
	})

	// 必須入力項目が不足している場合はエラー
	if (missingRequiredFields.length > 0) {
		const fieldNames = missingRequiredFields.map(({ name }) => name).join(", ")
		const message = `Required fields are missing: [${fieldNames}]`
		return { success: false, message }
	}

	// 渡されたデータのうち、レコード作成時に指定可能なフィールドのみを抽出
	const creatableFields = Object.entries(jsonData)
		.map(([fieldName, value]) => {
			const entityItem = entityItems.find(({ name }) => name === fieldName)
			if (entityItem?.is_creatable) {
				return { entityItem, value }
			}
		})
		.filter((v) => !!v)

	// フィールド値のバリデーション
	const validateResults = await Promise.all(
		creatableFields.map(async ({ entityItem, value }) => {
			return { entityItem, result: await validateFieldValue(entityItem, value) }
		}),
	)

	// 一件でもバリデーションに失敗したらエラー
	const failedResult = validateResults.find(({ result }) => !result.success)
	if (failedResult?.result.success === false) {
		return { success: false, message: failedResult.result.message }
	}

	// バリデーションが成功しているフィールドのみを抽出
	const successResults = validateResults.filter(
		(
			v,
		): v is {
			entityItem: EntityItem
			result: ValidateFieldValueResultSuccess
		} => {
			return v.result.success
		},
	)

	return { success: true, fields: successResults }
}
