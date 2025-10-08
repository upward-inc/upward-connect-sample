import { JsonObjectSchema } from "../../schema/common"
import type { EntityItem } from "../../schema/entity-item"
import type { PatchRecordBody } from "../../schema/record"
import { getEntityItemList } from "../entity"
import {
	type ValidateFieldValueResultSuccess,
	validateFieldValue,
} from "./validate-field-value"

export type ValidateUpdateRecordBodyResult =
	| ValidateUpdateRecordBodyResultSuccess
	| ValidateUpdateRecordBodyResultFailure

export interface ValidateUpdateRecordBodyResultSuccess {
	success: true
	fields: {
		entityItem: EntityItem
		result: ValidateFieldValueResultSuccess
	}[]
}

export interface ValidateUpdateRecordBodyResultFailure {
	success: false
	message: string
}

export const validateUpdateRecordBody = async (
	entity_name: string,
	data: PatchRecordBody,
): Promise<ValidateUpdateRecordBodyResult> => {
	// JSONオブジェクトであることの検証（変換）
	const jsonData = JsonObjectSchema.parse(data)

	const entityItems = await getEntityItemList(entity_name)

	// 渡されたデータのうち、レコード更新時に指定可能なフィールドのみを抽出
	const updatableFields = Object.entries(jsonData)
		.map(([fieldName, value]) => {
			const entityItem = entityItems.find(({ name }) => name === fieldName)
			if (entityItem?.is_updatable) {
				return { entityItem, value }
			}
		})
		.filter((v) => !!v)

	// フィールド値のバリデーション
	const validateResults = await Promise.all(
		updatableFields.map(async ({ entityItem, value }) => {
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
