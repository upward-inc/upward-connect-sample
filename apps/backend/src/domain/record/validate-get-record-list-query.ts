import { configuration } from "../../configuration"
import type { GetRecordListQuery } from "../../schema/record"

type ValidateGetRecordListQueryResult =
	| ValidateGetRecordListQueryResultSuccess
	| ValidateGetRecordListQueryResultFailure

interface ValidateGetRecordListQueryResultSuccess {
	success: true
}

interface ValidateGetRecordListQueryResultFailure {
	success: false
	message: string
}

export const validateGetRecordListQuery = (
	entity_name: string,
	query: GetRecordListQuery,
): ValidateGetRecordListQueryResult => {
	const { group_by, fields, location } = query

	if (group_by && group_by.length > 0) {
		const invalidFields = fields.filter((field) => !group_by.includes(field))

		if (invalidFields.length > 0) {
			return {
				success: false,
				message:
					"When 'group_by' is specified, all fields in 'fields' must be included in 'group_by'",
			}
		}
	}

	if (location) {
		if (group_by) {
			return {
				success: false,
				message: "Location-based queries cannot be combined with 'group_by'",
			}
		}

		// ロケーション検索が可能なエンティティかどうかを確認
		const locationEntities: string[] = [...configuration.LOCATION_ENTITIES]
		if (!locationEntities.includes(entity_name)) {
			return {
				success: false,
				message: `Entity '${entity_name}' does not support location-based queries`,
			}
		}
	}

	return { success: true }
}
