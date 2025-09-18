import type { JsonValue } from "../../schema/common"
import type { PostRecordBody } from "../../schema/record"
import { getEntity, getEntityItemList } from "../entity"
import { validateFieldValue } from "./validate-field-value"

type ValidateCreateRecordResult = {
	success: boolean
	validatedData?: Record<string, JsonValue>
	error?: string
	error_description?: string
}

export const validateCreateRecordParams = async (
	userId: string,
	{ entity_name, data }: PostRecordBody,
): Promise<ValidateCreateRecordResult> => {
	// Check if entity exists
	if (!(await getEntity(entity_name))) {
		return {
			success: false,
			error: "invalid_request",
			error_description: `Entity '${entity_name}' does not exist`,
		}
	}

	// Get entity items configuration
	const entityItems = await getEntityItemList(entity_name)
	const entityItemMap = new Map(entityItems.map((item) => [item.name, item]))

	// Validate required fields
	const requiredFields = entityItems.filter(
		(item) => item.is_required && item.is_creatable,
	)
	const missingRequiredFields = requiredFields.filter(
		(field) =>
			!(field.name in data) ||
			data[field.name] === null ||
			data[field.name] === undefined,
	)

	if (missingRequiredFields.length > 0) {
		const fieldNames = missingRequiredFields.map((f) => f.name).join("', '")
		return {
			success: false,
			error: "invalid_request",
			error_description: `Field '${fieldNames}' ${missingRequiredFields.length === 1 ? "is" : "are"} required for '${entity_name}'`,
		}
	}

	// Validate field types and values
	const validatedData: Record<string, JsonValue> = {}

	for (const [fieldName, value] of Object.entries(data)) {
		const entityItem = entityItemMap.get(fieldName)
		// Ignore unknown fields
		if (!entityItem) {
			continue
		}
		// Skip non-creatable fields
		if (!entityItem.is_creatable) {
			continue
		}

		// Validate field value
		const { success, validatedValue, error, error_description } =
			await validateFieldValue(entityItem, value as JsonValue, entity_name)
		if (!success) {
			return {
				success: false,
				error,
				error_description,
			}
		}
		if (validatedValue !== undefined) {
			validatedData[fieldName] = validatedValue
		}
	}

	// Special handling for user entity to set user_name
	if (entity_name === "user") {
		validatedData.user_name = `${validatedData.first_name} ${validatedData.last_name}`
		validatedData.hashed_password = await Bun.password.hash(
			`${validatedData.first_name}-${validatedData.last_name}`,
		)
	} else {
		// TODO: 自動採番の想定だが、一旦ランダムな数値を設定
		if (entity_name === "case") {
			validatedData.case_number = Math.floor(Math.random() * 1000000)
		}
		// For other entities, set owner, created_by and modified_by
		const userReference = JSON.stringify({ entity: "user", id: userId })
		validatedData.owner = userReference
		validatedData.created_by = userReference
		validatedData.modified_by = userReference
	}
	return { success: true, validatedData: validatedData }
}
