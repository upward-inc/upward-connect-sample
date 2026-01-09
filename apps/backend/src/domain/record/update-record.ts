import { configuration } from "../../configuration"
import { prisma } from "../../libs/prisma"
import type { PatchRecordResponse } from "../../schema/record"
import { escapeName, escapeStringValue } from "../../utility/sql"
import { getEntityItemList } from "../entity"
import type { ValidateUpdateRecordBodyResultSuccess } from "./validate-update-record-body"

export const updateRecord = async (
	userId: string,
	recordId: string,
	entityName: string,
	fields: ValidateUpdateRecordBodyResultSuccess["fields"],
): Promise<PatchRecordResponse> => {
	// このサンプルシステムにおける仕様に合わせて、操作ユーザー等の設定や値の変換を実施

	const entityItems = await getEntityItemList(entityName)

	const modifiedBy = entityItems.find(({ name }) => name === "modified_by")
	const modifiedAt = entityItems.find(({ name }) => name === "modified_at")

	const userReferenceData = {
		success: true as const,
		kind: "reference-input" as const,
		value: { entity_name: "user", id: userId },
	}

	const nowData = {
		success: true as const,
		kind: "date" as const,
		value: new Date(),
	}

	const updateFields: ValidateUpdateRecordBodyResultSuccess["fields"] = [
		...fields,
		// 操作ユーザーカラムが存在するエンティティの場合は、対象ユーザー情報を設定
		...(modifiedBy
			? [{ entityItem: modifiedBy, result: userReferenceData }]
			: []),
		// 更新日時カラムが存在するエンティティの場合は、現在日時を設定
		...(modifiedAt ? [{ entityItem: modifiedAt, result: nowData }] : []),
	]
	const latitudeField = updateFields.find(
		({ entityItem }) => entityItem.name === "latitude",
	)
	const longitudeField = updateFields.find(
		({ entityItem }) => entityItem.name === "longitude",
	)
	if (latitudeField && longitudeField) {
		// 位置情報は別途設定するため、UPDATE文から除外
		updateFields.splice(updateFields.indexOf(latitudeField), 1)
		updateFields.splice(updateFields.indexOf(longitudeField), 1)
	}

	const locationEntities: string[] = [...configuration.LOCATION_ENTITIES]

	const setClause = updateFields
		.map(({ entityItem, result }) => {
			if (result.kind === "null") {
				return {
					column: entityItem.name,
					value: "NULL",
				}
			}
			if (result.kind === "string") {
				return {
					column: entityItem.name,
					value: escapeStringValue(result.value),
				}
			}
			if (result.kind === "boolean") {
				return { column: entityItem.name, value: result.value ? "1" : "0" }
			}
			if (result.kind === "number") {
				return { column: entityItem.name, value: result.value }
			}
			if (result.kind === "date") {
				return {
					column: entityItem.name,
					value: escapeStringValue(result.value.toISOString()),
				}
			}
			if (result.kind === "string-array") {
				return {
					column: entityItem.name,
					value: escapeStringValue(JSON.stringify(result.value)),
				}
			}
			if (result.kind === "reference-input") {
				return {
					column: entityItem.name,
					value: escapeStringValue(JSON.stringify(result.value)),
				}
			}
			if (result.kind === "reference-input-array") {
				return {
					column: entityItem.name,
					value: escapeStringValue(JSON.stringify(result.value)),
				}
			}
		})
		.filter((v) => !!v)
		.map(({ column, value }) => `${escapeName(column)} = ${value}`)
		.join(", ")
		// 位置情報の設定が必要な場合は、SET句に追加
		.concat(
			locationEntities.includes(entityName) && longitudeField && latitudeField
				? `, [location] = geography::Point(${latitudeField.result.value}, ${longitudeField.result.value}, 4326)`
				: "",
		)

	const query = `
		UPDATE ${escapeName(entityName)} SET ${setClause}
		WHERE id = ${escapeStringValue(recordId)}
	`

	await prisma.$queryRawUnsafe(query)

	return { entity_name: entityName, id: recordId }
}
