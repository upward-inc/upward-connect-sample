import { HTTPException } from "hono/http-exception"
import { prisma } from "../../libs/prisma"
import type { JsonValue } from "../../schema/common"
import type { PostRecordBody, PostRecordResponse } from "../../schema/record"
import { getEntity, getEntityItemList } from "../entity"
import { validateFieldValue } from "./validate-field-value"

export const createRecord = async (
	userId: string,
	{ entity_name, data }: PostRecordBody,
): Promise<PostRecordResponse> => {
	// Check if entity exists
	const entity = await getEntity(entity_name)
	if (!entity) {
		throw new HTTPException(400, {
			message: `Entity '${entity_name}' does not exist`,
		})
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
		throw new HTTPException(400, {
			message: `'${fieldNames}' ${missingRequiredFields.length === 1 ? "is" : "are"} required for '${entity_name}'`,
		})
	}

	// Validate field types and values
	const validatedData: Record<
		string,
		string | number | boolean | JsonValue | null
	> = {}

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
		const validatedValue = await validateFieldValue(
			entityItem,
			value as JsonValue,
			entity_name,
		)
		validatedData[fieldName] = validatedValue
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

	// Create record in database
	const result = await createRecordInDatabase(entity_name, validatedData)

	return {
		entity_name: entity_name,
		id: result.id,
	}
}

const createRecordInDatabase = async (
	entityName: string,
	data: Record<string, string | number | boolean | JsonValue | null>,
): Promise<{ id: string }> => {
	const fields = Object.keys(data)
	const values = Object.values(data)

	// Build complete SQL with proper value escaping for SQL Server
	const fieldsList = fields.map((field) => `[${field}]`).join(", ")

	const escapedValues = values.map((value) => {
		if (value === null || value === undefined) {
			return "NULL"
		}
		if (typeof value === "string") {
			// Use N prefix for Unicode strings in SQL Server and escape single quotes
			return `N'${value.replace(/'/g, "''")}'`
		}
		if (typeof value === "boolean") {
			return value ? "1" : "0"
		}
		return String(value)
	})

	const valuesClause = escapedValues.join(", ")

	const query = `
		INSERT INTO [${entityName}] (${fieldsList})
		OUTPUT INSERTED.id
		VALUES (${valuesClause})
	`

	try {
		const result = await prisma.$queryRawUnsafe<{ id: string }[]>(query)

		if (!result || result.length === 0) {
			throw new HTTPException(500, {
				message: `Failed to create record in '${entityName}'`,
			})
		}

		return { id: result[0].id }
	} catch (error) {
		console.error(`Error creating record in '${entityName}':`, error)
		throw new HTTPException(500, {
			message: `Failed to create record in '${entityName}'`,
		})
	}
}
