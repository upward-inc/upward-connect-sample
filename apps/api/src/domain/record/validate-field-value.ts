import { parse } from "@formkit/tempo"
import { z } from "zod"

import {
	EMailSchema,
	ISO8601DateSchema,
	ISO8601DatetimeSchema,
	ISO8601TimeSchema,
	PhoneNumberSchema,
	UrlSchema,
} from "../../schema/common"
import type { JsonValue } from "../../schema/common"
import type { EntityItem } from "../../schema/entity-item"
import {
	type RecordReferenceInput,
	RecordReferenceInputSchema,
} from "../../schema/record"
import { getRecordExists } from "./get-record-exists"

export type ValidateFieldValueResult =
	| ValidateFieldValueResultSuccess
	| ValidateFieldValueResultFailure

export type ValidateFieldValueResultSuccess =
	| ValidateFieldValueResultSuccessNull
	| ValidateFieldValueResultSuccessString
	| ValidateFieldValueResultSuccessNumber
	| ValidateFieldValueResultSuccessBoolean
	| ValidateFieldValueResultSuccessDate
	| ValidateFieldValueResultSuccessStringArray
	| ValidateFieldValueResultSuccessReferenceInput
	| ValidateFieldValueResultSuccessReferenceInputArray

export interface ValidateFieldValueResultFailure {
	success: false
	message: string
}

interface ValidateFieldValueResultSuccessNull {
	success: true
	kind: "null"
	value: null
}

interface ValidateFieldValueResultSuccessString {
	success: true
	kind: "string"
	value: string
}

interface ValidateFieldValueResultSuccessNumber {
	success: true
	kind: "number"
	value: number
}

interface ValidateFieldValueResultSuccessBoolean {
	success: true
	kind: "boolean"
	value: boolean
}

interface ValidateFieldValueResultSuccessDate {
	success: true
	kind: "date"
	value: Date
}

interface ValidateFieldValueResultSuccessStringArray {
	success: true
	kind: "string-array"
	value: string[]
}

interface ValidateFieldValueResultSuccessReferenceInput {
	success: true
	kind: "reference-input"
	value: RecordReferenceInput
}

interface ValidateFieldValueResultSuccessReferenceInputArray {
	success: true
	kind: "reference-input-array"
	value: RecordReferenceInput[]
}

export const validateFieldValue = async (
	entityItem: EntityItem,
	value: JsonValue,
): Promise<ValidateFieldValueResult> => {
	// null設定可能な項目にnullを設定された場合は早期リターン
	if (!entityItem.is_required && value === null) {
		return { success: true, kind: "null", value: null }
	}

	const validateFunctions: Record<
		EntityItem["type"],
		(
			entityItem: EntityItem,
			value: JsonValue,
		) => ValidateFieldValueResult | Promise<ValidateFieldValueResult>
	> = {
		text: validateTextValue,
		numeric: validateNumericValue,
		boolean: validateBooleanValue,
		date: validateDateValue,
		option: validateOptionValue,
		reference: validateReferenceValue,
	}

	return validateFunctions[entityItem.type](entityItem, value)
}

const validateTextValue = (
	entityItem: EntityItem,
	value: JsonValue,
): ValidateFieldValueResultSuccessString | ValidateFieldValueResultFailure => {
	// 文字列かどうかの検証
	const { success: isString, data: stringValue } = z.string().safeParse(value)

	if (!isString) {
		const message = `Field '${entityItem.name}' must be a string`
		return { success: false, message }
	}

	// NOTE: 要件に応じて詳細なバリデーションを実施する

	// // メールアドレス形式の検証
	// if (entityItem.sub_type === "email") {
	// 	const { success } = EMailSchema.safeParse(stringValue)
	// 	if (!success) {
	// 		const message = `Field '${entityItem.name}' must be a valid email address`
	// 		return { success: false, message }
	// 	}
	// }

	// // 電話番号形式の検証
	// if (entityItem.sub_type === "phone") {
	// 	const { success } = PhoneNumberSchema.safeParse(stringValue)
	// 	if (!success) {
	// 		const message = `Field '${entityItem.name}' must be a valid phone number`
	// 		return { success: false, message }
	// 	}
	// }

	// // URL形式の検証
	// if (entityItem.sub_type === "url") {
	// 	const { success } = UrlSchema.safeParse(stringValue)
	// 	if (!success) {
	// 		const message = `Field '${entityItem.name}' must be a valid URL`
	// 		return { success: false, message }
	// 	}
	// }

	return { success: true, kind: "string", value: stringValue }
}

const validateNumericValue = (
	entityItem: EntityItem,
	value: JsonValue,
): ValidateFieldValueResultSuccessNumber | ValidateFieldValueResultFailure => {
	// 数値かどうかの検証
	const { success: isNumber, data: numberValue } = z
		.number()
		.finite()
		.safeParse(value)

	if (!isNumber) {
		const message = `Field '${entityItem.name}' must be a number`
		return { success: false, message }
	}

	// 整数かどうかの検証
	if (entityItem.sub_type === "integer") {
		const { success } = z.number().int().safeParse(numberValue)
		if (!success) {
			const message = `Field '${entityItem.name}' must be an integer`
			return { success: false, message }
		}
	}

	return { success: true, kind: "number", value: numberValue }
}

const validateBooleanValue = (
	entityItem: EntityItem,
	value: JsonValue,
): ValidateFieldValueResult => {
	// 真偽値かどうかの検証
	const { success: isBoolean, data: booleanValue } = z
		.boolean()
		.safeParse(value)

	if (!isBoolean) {
		const message = `Field '${entityItem.name}' must be a boolean`
		return { success: false, message }
	}

	return { success: true, kind: "boolean", value: booleanValue }
}

const validateDateValue = (
	entityItem: EntityItem,
	value: JsonValue,
):
	| ValidateFieldValueResultSuccessString
	| ValidateFieldValueResultSuccessDate
	| ValidateFieldValueResultFailure => {
	// 日付形式の検証
	if (entityItem.sub_type === "date") {
		const { success: isDate, data: dateValue } =
			ISO8601DateSchema.safeParse(value)

		if (!isDate) {
			const message = `Field '${entityItem.name}' must be a valid date string (YYYY-MM-DD)`
			return { success: false, message }
		}
		return { success: true, kind: "string", value: dateValue }
	}

	// 日時形式（日付と時刻）の検証
	if (entityItem.sub_type === "datetime") {
		const { success: isDatetime, data: datetimeValue } =
			ISO8601DatetimeSchema.safeParse(value)

		if (!isDatetime) {
			const message = `Field '${entityItem.name}' must be a valid datetime string (YYYY-MM-DDTHH:MM[:SS[.s+]]Z)`
			return { success: false, message }
		}
		return { success: true, kind: "date", value: parse(datetimeValue) }
	}

	// 時刻形式の検証
	if (entityItem.sub_type === "time") {
		const { success: isTime, data: timeValue } =
			ISO8601TimeSchema.safeParse(value)

		if (!isTime) {
			const message = `Field '${entityItem.name}' must be a valid time string (HH:MM[:SS[.s+]])`
			return { success: false, message }
		}
		return { success: true, kind: "string", value: timeValue }
	}

	return { success: false, message: "Invalid sub_type" }
}

const validateOptionValue = (
	entityItem: EntityItem,
	value: JsonValue,
):
	| ValidateFieldValueResultSuccessStringArray
	| ValidateFieldValueResultFailure => {
	const subType = entityItem.sub_type ?? "single"

	// sub_typeの妥当性チェック
	if (subType !== "single" && subType !== "multi") {
		return { success: false, message: "Invalid sub_type for option field" }
	}

	// 構造の妥当性チェック
	const { success: isOptions, data: selectedOptions } = z
		.union([
			z.string(),
			subType === "single"
				? z.array(z.string()).length(1)
				: z.array(z.string()),
		])
		.transform((val) => (!Array.isArray(val) ? [val] : val))
		.safeParse(value)

	if (!isOptions) {
		const message =
			subType === "single"
				? `Field '${entityItem.name}' must be a string or an array containing a single string`
				: `Field '${entityItem.name}' must be an array of strings`
		return { success: false, message }
	}

	const allOptionNames = (entityItem.options ?? []).map(({ name }) => name)

	// 選択肢の妥当性チェック
	const invalidOptions = selectedOptions.filter((option) => {
		return !allOptionNames.includes(option)
	})
	if (invalidOptions.length > 0) {
		const message = `Field '${entityItem.name}' must be one of the valid options: ${allOptionNames.join(", ")}`
		return { success: false, message }
	}

	return { success: true, kind: "string-array", value: selectedOptions }
}

const validateReferenceValue = async (
	entityItem: EntityItem,
	value: JsonValue,
): Promise<
	| ValidateFieldValueResultSuccessReferenceInput
	| ValidateFieldValueResultSuccessReferenceInputArray
	| ValidateFieldValueResultFailure
> => {
	const subType = entityItem.sub_type ?? "single"

	// single
	if (subType === "single") {
		// 構造の妥当性チェック
		const { success: isReferenceInput, data: referenceInput } = z
			.union([
				RecordReferenceInputSchema,
				z.array(RecordReferenceInputSchema).length(1),
			])
			.transform((val) => (Array.isArray(val) ? val[0] : val))
			.safeParse(value)

		if (!isReferenceInput) {
			const message = `Field '${entityItem.name}' must be a record reference input or an array containing a single record reference input`
			return { success: false, message }
		}

		// 項目に指定可能なエンティティかどうかのチェック
		const validEntities = entityItem.reference_entities ?? []
		const isValidEntity = validEntities.includes(referenceInput.entity)
		if (!isValidEntity) {
			const message = `Field '${entityItem.name}' must reference one of the allowed entities: ${validEntities.join(", ")}`
			return { success: false, message }
		}

		// レコードの存在確認
		const isRecordExists = await getRecordExists(
			referenceInput.entity,
			referenceInput.id,
		)
		if (!isRecordExists) {
			const message = `Field '${entityItem.name}' references a non-existent record`
			return { success: false, message }
		}

		return {
			success: true,
			kind: "reference-input",
			value: referenceInput,
		}
	}

	// multi
	if (subType === "multi") {
		// 構造の妥当性チェック
		const { success: isReferenceInputArray, data: referenceInputs } = z
			.array(RecordReferenceInputSchema)
			.safeParse(value)

		if (!isReferenceInputArray) {
			const message = `Field '${entityItem.name}' must be an array of record reference input`
			return { success: false, message }
		}

		// 各参照の妥当性チェック
		for (const referenceInput of referenceInputs) {
			// 項目に指定可能なエンティティかどうかのチェック
			const validEntities = entityItem.reference_entities ?? []
			const isValidEntity = validEntities.includes(referenceInput.entity)
			if (!isValidEntity) {
				const message = `Field '${entityItem.name}' must reference one of the allowed entities: ${validEntities.join(", ")}`
				return { success: false, message }
			}

			// レコードの存在確認
			const isRecordExists = await getRecordExists(
				referenceInput.entity,
				referenceInput.id,
			)
			if (!isRecordExists) {
				const message = `Field '${entityItem.name}' references a non-existent record`
				return { success: false, message }
			}
		}

		return {
			success: true,
			kind: "reference-input-array",
			value: referenceInputs,
		}
	}

	return { success: false, message: "Invalid sub_type for reference field" }
}
