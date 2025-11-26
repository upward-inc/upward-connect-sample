import { format } from "@formkit/tempo"
import { prisma } from "../../libs/prisma"
import type { JsonValue } from "../../schema/common"
import { collectFilterFields } from "../../schema/filter"
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
	const entityItemMap = new Map(
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

	const filterFields = collectFilterFields(filter)

	const needFormulaField = [
		...fields,
		...filterFields,
		...(order_by?.map(({ field }) => field) ?? []),
	].some((field) => {
		const item = entityItemMap.get(field)
		return !!item?.is_formula
	})

	const hasProfile = [
		...fields,
		...filterFields,
		...(order_by?.map(({ field }) => field) ?? []),
	].some((field) => field === "profile_name")
	const hasRole = [
		...fields,
		...filterFields,
		...(order_by?.map(({ field }) => field) ?? []),
	].some((field) => field === "role_name")

	const selectFields = fields
		.map((field) => entityItemMap.get(field))
		.filter((field) => !!field)

	const selectClause = SelectClauseSchema.parse(selectFields)

	// 数式が必要な場合のみビューを参照
	const userFrom = `FROM [user${needFormulaField ? "_view]" : "]"}`
	const userAccessControlFrom =
		hasProfile || hasRole
			? "LEFT OUTER JOIN [user_access_control] ON [user].[id] = [user_access_control].[user_id]"
			: ""
	const profileFrom = hasProfile
		? "LEFT OUTER JOIN [profile] ON [user_access_control].[profile_id] = [profile].[id]"
		: ""
	const roleFrom = hasRole
		? "LEFT OUTER JOIN [role] ON [user_access_control].[role_id] = [role].[id]"
		: ""

	const whereClause = WhereClauseSchema.parse({
		items: Array.from(entityItemMap.values()),
		filter,
	})

	const orderBy = appendUserNameToOrderBy(order_by ?? [])

	const orderByClause = OrderByClauseSchema.parse(orderBy)

	const pagingClause = PagingClauseSchema.parse({
		// `has_next_page`の効率的な算出の為、指定された件数よりも1件多く取得する
		limit: limit ? limit + 1 : undefined,
		offset: offset ?? 0,
	})

	const fetchDataQuery = [
		selectClause,
		userFrom,
		userAccessControlFrom,
		profileFrom,
		roleFrom,
		whereClause,
		orderByClause,
		pagingClause,
	]
		.filter((clause) => !!clause)
		.join("\n")

	const fetchTotalSizeQuery = [
		"SELECT COUNT(*) AS count",
		userFrom,
		userAccessControlFrom,
		profileFrom,
		roleFrom,
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
