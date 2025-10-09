import type { GetRecordListQuery } from "../../schema/record"

export type ValidateGetRecordListQueryResult =
	| ValidateGetRecordListQueryResultSuccess
	| ValidateGetRecordListQueryResultFailure

export interface ValidateGetRecordListQueryResultSuccess {
	success: true
}

export interface ValidateGetRecordListQueryResultFailure {
	success: false
	message: string
}

export const validateGetRecordListQuery = (
	query: GetRecordListQuery,
): ValidateGetRecordListQueryResult => {
	const { group_by, fields } = query

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

	return { success: true }
}
