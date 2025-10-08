import {
	type ValidateCreateRecordBodyResultSuccess,
	escapeName,
	escapeStringValue,
} from "."
import { getEntityItemList } from "../../domain/entity"
import { prisma } from "../../libs/prisma"
import type { PostRecordResponse } from "../../schema/record"

export const createRecord = async (
	userId: string,
	entityName: string,
	fields: ValidateCreateRecordBodyResultSuccess["fields"],
): Promise<PostRecordResponse> => {
	// このサンプルシステムにおける仕様に合わせて、操作ユーザー等の設定や値の変換を実施

	const entityItems = await getEntityItemList(entityName)

	const owner = entityItems.find(({ name }) => name === "owner")
	const createdBy = entityItems.find(({ name }) => name === "created_by")
	const modifiedBy = entityItems.find(({ name }) => name === "modified_by")

	const userReferenceData = {
		success: true as const,
		kind: "reference-input-array" as const,
		value: [{ entity: "user", id: userId }],
	}

	const insertFields: ValidateCreateRecordBodyResultSuccess["fields"] = [
		...fields,
		// 所有者や操作ユーザーカラムが存在するエンティティの場合は、対象ユーザー情報を設定
		...(owner ? [{ entityItem: owner, result: userReferenceData }] : []),
		...(createdBy
			? [{ entityItem: createdBy, result: userReferenceData }]
			: []),
		...(modifiedBy
			? [{ entityItem: modifiedBy, result: userReferenceData }]
			: []),
	]

	const columnsClause = insertFields
		.map(({ entityItem }) => escapeName(entityItem.name))
		.join(", ")

	const valuesClause = insertFields
		.map(({ result }) => {
			if (result.kind === "null") {
				return "NULL"
			}
			if (result.kind === "string") {
				return escapeStringValue(result.value)
			}
			if (result.kind === "boolean") {
				return result.value ? "1" : "0"
			}
			if (result.kind === "number") {
				return result.value
			}
			if (result.kind === "date") {
				return escapeStringValue(result.value.toISOString())
			}
			if (result.kind === "string-array") {
				return escapeStringValue(JSON.stringify(result.value))
			}
			if (result.kind === "reference-input") {
				return escapeStringValue(JSON.stringify(result.value))
			}
			if (result.kind === "reference-input-array") {
				return escapeStringValue(JSON.stringify(result.value))
			}
		})
		.join(", ")

	const query = `
		INSERT INTO ${escapeName(entityName)} (${columnsClause})
		OUTPUT INSERTED.id
		VALUES (${valuesClause})
	`

	const result = await prisma.$queryRawUnsafe<{ id: string }[]>(query)

	return { entity_name: entityName, id: result[0].id }
}
