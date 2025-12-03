import { format } from "@formkit/tempo"
import { prisma } from "../../libs/prisma"
import type { JsonValue } from "../../schema/common"
import { type Filter, collectFilterFields } from "../../schema/filter"
import {
	type Field,
	OrderByClauseSchema,
	PagingClauseSchema,
	SelectClauseSchema,
	WhereClauseSchema,
} from "../../schema/sql"
import type {
	GetSystemUserListQuery,
	GetSystemUserListResponse,
} from "../../schema/system-user"
import { getEntityItemList } from "../entity"

type DBRecord = Record<string, JsonValue>

export const getSystemUserList = async ({
	fields,
	filter,
	order_by,
	limit,
	offset,
}: GetSystemUserListQuery): Promise<GetSystemUserListResponse> => {
	const entityItems = await getEntityItemList("user")
	const entityItemMap = new Map<string, Field & { is_formula: boolean }>(
		entityItems.map((item) => [
			item.name,
			{
				table_name: "user",
				column_name: item.name,
				alias_name: item.name,
				type: item.type,
				sub_type: item.sub_type,
				reference_entities: item.reference_entities,
				is_formula: item.is_formula,
			},
		]),
	)
	// user_access_control経由で参照するフィールドを追加
	entityItemMap.set("profile_name", {
		table_name: "profile",
		column_name: "name",
		alias_name: "profile_name",
		type: "text",
		sub_type: null,
		reference_entities: null,
		is_formula: false,
	})
	entityItemMap.set("role_name", {
		table_name: "role",
		column_name: "name",
		alias_name: "role_name",
		type: "text",
		sub_type: null,
		reference_entities: null,
		is_formula: false,
	})

	// SELECT句の生成
	const selectClause = toSelectClause(fields, entityItemMap)

	// FROM句の生成
	const fromClause = toFromClause(fields, entityItemMap, filter, order_by)

	// WHERE句の生成
	const whereClause = WhereClauseSchema.parse({
		items: Array.from(entityItemMap.values()),
		filter,
	})

	// ORDER BY句の生成
	const orderBy = appendUserNameToOrderBy(order_by ?? [])
	const orderByClause = OrderByClauseSchema.parse(orderBy)

	// OFFSET / LIMIT句の生成
	const pagingClause = PagingClauseSchema.parse({
		// `has_next_page`の効率的な算出の為、指定された件数よりも1件多く取得する
		limit: limit ? limit + 1 : undefined,
		offset: offset ?? 0,
	})

	const fetchDataQuery = [
		selectClause,
		fromClause,
		whereClause,
		orderByClause,
		pagingClause,
	]
		.filter((clause) => !!clause)
		.join("\n")

	const fetchTotalSizeQuery = [
		"SELECT COUNT(*) AS count",
		fromClause,
		whereClause,
	]
		.filter((clause) => !!clause)
		.join("\n")

	const [fetchDataResult, totalSizeResult] = await Promise.all([
		prisma.$queryRawUnsafe<DBRecord[]>(fetchDataQuery),
		prisma.$queryRawUnsafe<{ count: number }[]>(fetchTotalSizeQuery),
	])

	// 余分に取得したレコードを除外
	const records = limit ? fetchDataResult.slice(0, limit) : fetchDataResult

	const data = await covertRecords(records, fields, entityItemMap)
	const hasNextPage = limit ? fetchDataResult.length > limit : false
	const totalSize = totalSizeResult.at(0)?.count ?? 0

	return {
		has_next_page: hasNextPage,
		total_size: totalSize,
		data,
	}
}

const toSelectClause = (
	fields: string[],
	entityItemMap: Map<string, Field>,
) => {
	const selectFields = fields
		.map((field) => entityItemMap.get(field))
		.filter((field) => !!field)

	return SelectClauseSchema.parse(selectFields)
}

const toFromClause = (
	fields: string[],
	entityItemMap: Map<string, { is_formula: boolean }>,
	filter?: Filter,
	order_by?: Array<{ field: string; direction: "asc" | "desc" }>,
) => {
	const filterFields = collectFilterFields(filter)
	const hasFieldMatching = (predicate: (field: string) => boolean) => {
		return [
			...fields,
			...filterFields,
			...(order_by?.map(({ field }) => field) ?? []),
		].some(predicate)
	}
	// queryに数式フィールドが含まれるかどうかを判定
	const needFormulaField = hasFieldMatching((field) => {
		const item = entityItemMap.get(field)
		return !!item?.is_formula
	})

	// プロファイルやロールのフィールドが含まれるかどうかを判定
	const hasProfileField = hasFieldMatching((field) => field === "profile_name")
	const hasRoleField = hasFieldMatching((field) => field === "role_name")

	// FROM句の生成
	// 数式が必要な場合のみビューを参照
	const userFrom = `FROM [user${needFormulaField ? "_view]" : "]"}`
	// プロファイルやロールのフィールドが必要な場合のみ、該当テーブルとJOINする
	const userAccessControlFrom =
		hasProfileField || hasRoleField
			? "LEFT OUTER JOIN [user_access_control] ON [user].[id] = [user_access_control].[user_id]"
			: ""
	const profileFrom = hasProfileField
		? "LEFT OUTER JOIN [profile] ON [user_access_control].[profile_id] = [profile].[id]"
		: ""
	const roleFrom = hasRoleField
		? "LEFT OUTER JOIN [role] ON [user_access_control].[role_id] = [role].[id]"
		: ""
	return [userFrom, userAccessControlFrom, profileFrom, roleFrom]
		.filter((clause) => !!clause)
		.join("\n")
}

const appendUserNameToOrderBy = (
	baseOrderBy: Array<{ field: string; direction: "asc" | "desc" }>,
): Array<{ field: string; direction: "asc" | "desc" }> => {
	// すでにuser_nameのソートが指定されている場合は追加不要
	const hasUserNameInOrderBy = baseOrderBy.some(
		({ field }) => field === "user_name",
	)
	if (hasUserNameInOrderBy) {
		return baseOrderBy
	}

	return [...baseOrderBy, { field: "user_name", direction: "asc" as const }]
}

// 一部のフィールド型において、Prisma($queryRawUnsafe)経由で取得したデータ型と結果として返却したいデータ型が一致しないので、適切な型に変換する
const covertRecords = async (
	records: DBRecord[],
	queryFields: string[],
	entityItemMap: Map<string, Field>,
) => {
	return records.map((row) => {
		let data: Record<string, JsonValue> = {}

		for (const field of queryFields) {
			const { type, sub_type } = entityItemMap.get(field) ?? {}
			let value = row[field]

			if (value !== null && type) {
				if (type === "boolean") {
					value = typeof value === "boolean" ? value : Boolean(value)
				}

				if (type === "date" && value instanceof Date) {
					if (sub_type === "date") {
						value = format({ date: value, format: "YYYY-MM-DD", tz: "UTC" })
					}
					if (sub_type === "time") {
						value = format({ date: value, format: "HH:mm:ss", tz: "UTC" })
					}
				}
			}

			const jsonValue = value instanceof Date ? value.toISOString() : value
			data = { ...data, [field]: jsonValue ?? null }
		}

		return data
	})
}
