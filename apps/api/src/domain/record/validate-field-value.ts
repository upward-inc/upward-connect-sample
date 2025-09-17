import { format } from "@formkit/tempo"
import { HTTPException } from "hono/http-exception"
import { prisma } from "../../libs/prisma"
import type { JsonValue } from "../../schema/common"
import type { EntityItem } from "../../schema/entity-item"
type Reference = {
	entity: string
	id: string
}

const validateTextValue = (
	value: JsonValue,
	name: string,
	sub_type: string | null | undefined,
	entityName: string,
): string => {
	if (typeof value !== "string") {
		throw new HTTPException(400, {
			message: `Field '${name}' must be a string for ${entityName}`,
		})
	}

	if (sub_type === "email") {
		// Simple email regex validation
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
		if (!emailRegex.test(value)) {
			throw new HTTPException(400, {
				message: `Field '${name}' must be a valid email address for '${entityName}'`,
			})
		}
	} else if (sub_type === "phone") {
		// Simple phone number validation (digits, spaces, dashes, parentheses)
		const phoneRegex = /^[0-9\s\-()+]+$/
		if (!phoneRegex.test(value)) {
			throw new HTTPException(400, {
				message: `Field '${name}' must be a valid phone number for '${entityName}'`,
			})
		}
	} else if (sub_type === "url") {
		try {
			new URL(value)
		} catch {
			throw new HTTPException(400, {
				message: `Field '${name}' must be a valid URL for '${entityName}'`,
			})
		}
	}
	return value
}

const validateNumericValue = (
	value: JsonValue,
	name: string,
	sub_type: string | null | undefined,
	entityName: string,
): number => {
	if (typeof value !== "number" && !Number.isFinite(Number(value))) {
		throw new HTTPException(400, {
			message: `Field '${name}' must be a number for '${entityName}'`,
		})
	}
	if (sub_type === "integer" && !Number.isInteger(value)) {
		throw new HTTPException(400, {
			message: `Field '${name}' must be an integer for '${entityName}'`,
		})
	}
	return Number(value)
}

const validateBooleanValue = (
	value: JsonValue,
	name: string,
	entityName: string,
): boolean => {
	if (typeof value !== "boolean") {
		throw new HTTPException(400, {
			message: `Field '${name}' must be a boolean for '${entityName}'`,
		})
	}
	return value
}

const validateDateValue = (
	value: JsonValue,
	name: string,
	sub_type: string | null | undefined,
	entityName: string,
): string => {
	if (typeof value === "string") {
		if (sub_type === "date") {
			// Expecting date only (YYYY-MM-DD)
			const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/
			if (!dateOnlyRegex.test(value)) {
				throw new HTTPException(400, {
					message: `Field '${name}' must be a valid date string (YYYY-MM-DD) for '${entityName}'`,
				})
			}
			return value
		}
		// Expecting full datetime
		const parsedDate = new Date(value)
		if (Number.isNaN(parsedDate.getTime())) {
			throw new HTTPException(400, {
				message: `Field '${name}' must be a valid datetime string for '${entityName}'`,
			})
		}
		return format({
			date: parsedDate,
			format: "YYYY-MM-DDTHH:mm:ssZ",
			tz: "Asia/Tokyo",
		})
	}
	throw new HTTPException(400, {
		message: `Field '${name}' must be a date for '${entityName}'`,
	})
}

const validateOptionValue = (
	value: JsonValue,
	name: string,
	sub_type: string | null | undefined,
	options: { name: string }[] | null | undefined,
	entityName: string,
): string => {
	if (!options || options.length === 0) {
		throw new HTTPException(400, {
			message: `Field '${name}' has no available options for '${entityName}'`,
		})
	}

	const optionNames = options.map((opt) => opt.name)

	if (sub_type === "single") {
		if (typeof value !== "string" || !optionNames.includes(value)) {
			throw new HTTPException(400, {
				message: `Field '${name}' must be one of: '${optionNames.join("', '")}' for '${entityName}'`,
			})
		}
		return JSON.stringify([value])
	}

	// multi-select
	if (!Array.isArray(value)) {
		throw new HTTPException(400, {
			message: `Field '${name}' must be an array for '${entityName}'`,
		})
	}
	const invalidOptions = value.filter(
		(v) => typeof v !== "string" || !optionNames.includes(v),
	)
	if (invalidOptions.length > 0) {
		throw new HTTPException(400, {
			message: `Field '${name}' contains invalid options: '${invalidOptions.join("', '")}' for '${entityName}'`,
		})
	}
	return JSON.stringify(value)
}

const validateReferenceValue = async (
	value: JsonValue,
	name: string,
	sub_type: string | null | undefined,
	reference_entities: string[] | null | undefined,
	entityName: string,
): Promise<string> => {
	if (!reference_entities || reference_entities.length === 0) {
		throw new HTTPException(400, {
			message: `Field '${name}' has no available reference entities for '${entityName}'`,
		})
	}
	if (sub_type === "single" && typeof value !== "string") {
		throw new HTTPException(400, {
			message: `Field '${name}' must be a string ID for '${entityName}'`,
		})
	}
	if (sub_type === "multi") {
		if (!Array.isArray(value) || value.some((v) => typeof v !== "string")) {
			throw new HTTPException(400, {
				message: `Field '${name}' must be an array of IDs for '${entityName}'`,
			})
		}
	}

	// Handle single reference or array of references
	const references = Array.isArray(value) ? value : [value]
	const validatedReferences: Reference[] = []

	for (const ref of references) {
		if (typeof ref === "string") {
			// Simple ID string - check all possible reference entities
			const referenceId = ref
			let foundEntity = null

			for (const entityName of reference_entities) {
				const exists = await checkReferenceExists(entityName, referenceId)
				if (exists) {
					foundEntity = entityName
					break
				}
			}

			if (!foundEntity) {
				throw new HTTPException(400, {
					message: `Referenced record '${referenceId}' does not exist in any of: '${reference_entities.join("', '")}' for '${entityName}'`,
				})
			}
			validatedReferences.push({ entity: foundEntity, id: referenceId })
		} else {
			// 辿りつかないはずだが、念のため
			throw new HTTPException(400, {
				message: `Field '${name}' reference must be a string ID for '${entityName}'`,
			})
		}
	}

	return JSON.stringify(
		Array.isArray(value) ? validatedReferences : validatedReferences[0],
	)
}

export const validateFieldValue = async (
	entityItem: EntityItem,
	value: JsonValue,
	entityName: string,
): Promise<string | number | boolean | JsonValue | null> => {
	const { name, type, sub_type, options, reference_entities } = entityItem

	// Handle null values
	if (value === null || value === undefined) {
		return null
	}

	// Validate based on type
	if (type === "text") {
		return validateTextValue(value, name, sub_type, entityName)
	}

	if (type === "numeric") {
		return validateNumericValue(value, name, sub_type, entityName)
	}

	if (type === "boolean") {
		return validateBooleanValue(value, name, entityName)
	}

	if (type === "date") {
		return validateDateValue(value, name, sub_type, entityName)
	}

	if (type === "option") {
		return validateOptionValue(value, name, sub_type, options, entityName)
	}

	if (type === "reference") {
		return await validateReferenceValue(
			value,
			name,
			sub_type,
			reference_entities,
			entityName,
		)
	}

	// Default case
	return value
}

// TODO: getRecordList() を使う
const checkReferenceExists = async (
	entityName: string,
	id: string,
): Promise<boolean> => {
	try {
		const escapedId = `N'${id.replace(/'/g, "''")}'`
		const query = `SELECT COUNT(*) as count FROM [${entityName}] WHERE id = ${escapedId} AND is_deleted = 0`

		const result = await prisma.$queryRawUnsafe<{ count: number }[]>(query)

		return result[0]?.count > 0
	} catch (error) {
		console.error(
			`Error checking reference existence for ${entityName}:${id}`,
			error,
		)
		return false
	}
}
