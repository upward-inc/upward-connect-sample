import { prisma } from "../../libs/prisma"
import type { JsonValue } from "../../schema/common"
import type { PostRecordResponse } from "../../schema/record"

export const createRecord = async (
	entityName: string,
	data: Record<string, JsonValue>,
): Promise<PostRecordResponse> => {
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
	const result = await prisma.$queryRawUnsafe<{ id: string }[]>(query)

	if (!result || result.length !== 1) {
		throw new Error("Failed to create record")
	}

	return { entity_name: entityName, id: result[0].id }
}
