import { format } from "@formkit/tempo"
import { prisma } from "../../libs/prisma"
import type { JsonValue } from "../../schema/common"
import { collectFilterFields } from "../../schema/filter"
import type {
	GetRecordListQuery,
	GetRecordListResponse,
} from "../../schema/record"
import {
	type Field,
	GroupByClauseSchema,
	OrderByClauseSchema,
	PagingClauseSchema,
	SelectClauseSchema,
	WhereClauseSchema,
} from "../../schema/sql"
import { getEntityItemList } from "../entity"

type DBRecord = Record<
	string,
	string | number | boolean | Date | JsonValue | null
>

type Reference = {
	entity_name: string
	id: string
}

export const getRecordList = async (
	entity_name: string,
	{
		fields,
		filter,
		group_by,
		order_by,
		limit,
		offset,
		location,
	}: GetRecordListQuery,
): Promise<GetRecordListResponse> => {
	const { point, radius } = location ?? {}
	const distanceQuery = point
		? toDistanceQuery(toGeographyPointQuery(point.latitude, point.longitude))
		: null
	const entityItems = await getEntityItemList(entity_name)
	const entityItemMap = new Map(
		entityItems.map((item) => [
			item.name,
			{
				table_name: entity_name,
				column_name: item.name,
				alias_name: item.name,
				type: item.type,
				sub_type: item.sub_type,
				reference_entities: item.reference_entities,
				is_formula: item.is_formula,
			},
		]),
	)

	const filterFields = collectFilterFields(filter)
	const needFormulaField = [
		...fields,
		...filterFields,
		...(group_by ?? []),
		...(order_by?.map(({ field }) => field) ?? []),
	].some((field) => {
		const item = entityItemMap.get(field)
		return !!item?.is_formula
	})

	const selectFields = fields
		.map((field) => entityItemMap.get(field))
		.filter((field) => !!field)

	const select = SelectClauseSchema.parse(selectFields)
	// ロケーション検索の場合、距離情報を追加で取得
	const selectClause = distanceQuery
		? `${select}, [location].[Lat] AS _latitude, [location].[Long] AS _longitude, ${distanceQuery} AS distance`
		: select

	// 数式が必要な場合のみビューを参照
	const fromClause = `FROM [${entity_name}${needFormulaField ? "_view" : ""}]`

	const where = WhereClauseSchema.parse({
		items: Array.from(entityItemMap.values()),
		filter,
	})
	// ロケーション検索の場合、距離条件を追加
	const whereClause = distanceQuery
		? `${where ? `${where} AND ` : "WHERE "}${distanceQuery} <= ${radius}`
		: where

	const groupByFields = group_by
		?.map((field) => entityItemMap.get(field))
		.filter((field) => !!field)

	const groupByClause = groupByFields
		? GroupByClauseSchema.parse(groupByFields)
		: null

	// ロケーション検索の場合、距離でのソートを優先的に適用
	const locationOrderBy = distanceQuery
		? [{ field: "distance", direction: "asc" as const }, ...(order_by ?? [])]
		: (order_by ?? [])
	const baseOrderBy = buildBaseOrderBy(locationOrderBy, groupByFields)
	const hasGroupByFields = hasFields(groupByFields)
	const orderBy = appendIdToOrderBy(baseOrderBy, hasGroupByFields)
	const orderByClause = OrderByClauseSchema.parse(orderBy)

	const pagingClause = PagingClauseSchema.parse({
		// `has_next_page`の効率的な算出の為、指定された件数よりも1件多く取得する
		limit: limit ? limit + 1 : undefined,
		offset: offset ?? 0,
	})

	const fetchDataQuery = [
		selectClause,
		fromClause,
		whereClause,
		groupByClause,
		orderByClause,
		pagingClause,
	]
		.filter((clause) => !!clause)
		.join("\n")

	const fetchTotalSizeQuery = (
		!groupByClause
			? ["SELECT COUNT(*) AS count", fromClause, whereClause]
			: [
					"SELECT COUNT(*) AS count FROM (",
					"SELECT 1 AS dummy",
					fromClause,
					whereClause,
					groupByClause,
					") count_table",
				]
	)
		.filter((clause) => !!clause)
		.join("\n")

	const [fetchDataResult, totalSizeResult] = await Promise.all([
		prisma.$queryRawUnsafe<DBRecord[]>(fetchDataQuery),
		prisma.$queryRawUnsafe<{ count: number }[]>(fetchTotalSizeQuery),
	])

	// 余分に取得したレコードを除外
	const records = limit ? fetchDataResult.slice(0, limit) : fetchDataResult

	const data = await covertRecords(records, fields, entityItemMap, !!location)
	const hasNextPage = limit ? fetchDataResult.length > limit : false
	const totalSize = totalSizeResult.at(0)?.count ?? 0

	return {
		has_next_page: hasNextPage,
		total_size: totalSize,
		data,
	}
}

const hasFields = (fields: Field[] | undefined): fields is Field[] => {
	return !!(fields && fields.length > 0)
}

const buildBaseOrderBy = (
	order_by: GetRecordListQuery["order_by"],
	groupByFields: Field[] | undefined,
): Array<{ field: string; direction: "asc" | "desc" }> => {
	if (order_by) return order_by

	if (hasFields(groupByFields)) {
		return groupByFields.map((field) => ({
			field: field.column_name,
			direction: "asc" as const,
		}))
	}

	return []
}

const appendIdToOrderBy = (
	baseOrderBy: Array<{ field: string; direction: "asc" | "desc" }>,
	hasGroupByFields: boolean,
): Array<{ field: string; direction: "asc" | "desc" }> => {
	if (hasGroupByFields) {
		return baseOrderBy
	}

	// すでにidのソートが指定されている場合は追加不要
	const hasIdInOrderBy = baseOrderBy.some(({ field }) => field === "id")
	if (hasIdInOrderBy) {
		return baseOrderBy
	}

	return [...baseOrderBy, { field: "id", direction: "asc" as const }]
}

const isArray = <T>(maybeArray: T | readonly T[]): maybeArray is T[] => {
	return Array.isArray(maybeArray)
}

// 一部のフィールド型において、Prisma($queryRawUnsafe)経由で取得したデータ型と結果として返却したいデータ型が一致しないので、適切な型に変換する
const covertRecords = async (
	records: DBRecord[],
	queryFields: string[],
	entityItemMap: Map<string, Field>,
	needLocation: boolean,
) => {
	const referenceRecords = await getReferenceRecords(records, entityItemMap)

	return records.map((row) => {
		let data: Record<string, JsonValue> = {}

		for (const field of queryFields) {
			const { type, sub_type } = entityItemMap.get(field) ?? {}
			let value = row[field]

			if (value !== null && type) {
				if (type === "numeric") {
					value = typeof value === "number" ? value : Number(value)
				}

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

				if (type === "option") {
					const options = Array.isArray(value)
						? value
						: JSON.parse(String(value))
					if (sub_type === "single") {
						value = options.at(0) ?? null
					} else {
						value = options
					}
				}

				if (type === "reference") {
					const references: Reference | Reference[] = JSON.parse(String(value))

					const getValue = (entity_name: string, id: string) => {
						return {
							entity_name,
							id,
							title: referenceRecords.get(entity_name)?.get(id) ?? "",
						}
					}

					if (!isArray(references)) {
						value = getValue(references.entity_name, references.id)
					} else {
						value = references.map((reference) =>
							getValue(reference.entity_name, reference.id),
						)
					}
				}
			}

			const jsonValue = value instanceof Date ? value.toISOString() : value
			data = { ...data, [field]: jsonValue ?? null }
		}

		// locationパラメータが指定されている場合、位置情報を示すローケーションフィールドを付与
		if (needLocation) {
			data = {
				...data,
				_location: {
					latitude: row._latitude as number | null,
					longitude: row._longitude as number | null,
				},
			}
		}

		return data
	})
}

const getReferenceRecords = async (
	records: DBRecord[],
	entityItemMap: Map<string, Field>,
): Promise<Map<string, Map<string, string>>> => {
	const referenceMap = new Map<string, Map<string, string>>()

	const entityConfigs = new Map<
		string,
		{ titleField: string; isFormula: boolean }
	>([
		["user", { titleField: "full_name", isFormula: true }],
		["account", { titleField: "name", isFormula: false }],
		["lead", { titleField: "full_name", isFormula: true }],
		["activity", { titleField: "subject", isFormula: false }],
		["phone_call", { titleField: "subject", isFormula: false }],
		["contact", { titleField: "full_name", isFormula: true }],
		["opportunity", { titleField: "name", isFormula: false }],
		["case", { titleField: "case_number", isFormula: false }],
		["product", { titleField: "name", isFormula: false }],
		["campaign", { titleField: "name", isFormula: false }],
		["sample", { titleField: "name", isFormula: false }],
	])

	const references = records.flatMap((record) => {
		return Array.from(entityItemMap.values())
			.filter(
				({ column_name, type }) =>
					type === "reference" && !!record[column_name],
			)
			.flatMap(({ column_name }) => {
				const value = record[column_name]
				const references: Reference | Reference[] = JSON.parse(String(value))
				return isArray(references) ? references : [references]
			})
	})

	// エンティティ毎の参照されているID
	const idsByEntity = new Map<string, Set<string>>()
	for (const { entity_name, id } of references) {
		if (!idsByEntity.has(entity_name)) {
			idsByEntity.set(entity_name, new Set())
		}
		idsByEntity.get(entity_name)?.add(id)
	}

	// エンティティ毎にレコードを取得
	const fetchPromises = Array.from(idsByEntity.entries()).map(
		async ([entity, ids]) => {
			const entityConfig = entityConfigs.get(entity)
			if (!entityConfig || ids.size === 0) {
				return { entity, records: [] }
			}

			const { titleField, isFormula } = entityConfig
			const from = isFormula ? `${entity}_view` : entity

			const records = await prisma.$queryRawUnsafe<
				{ id: string; title: string }[]
			>(
				`SELECT id, ${titleField} AS title FROM ${from} WHERE id IN (${Array.from(
					ids,
				)
					.map((id) => `'${id}'`)
					.join(",")})`,
			)
			return { entity, records }
		},
	)

	const result = await Promise.all(fetchPromises)

	// 結果の格納
	for (const { entity, records } of result) {
		referenceMap.set(
			entity,
			new Map(records.map(({ id, title }) => [id, title])),
		)
	}

	return referenceMap
}

const toGeographyPointQuery = (latitude: number, longitude: number) => {
	return `GEOGRAPHY::Point(${latitude}, ${longitude}, 4326)`
}

const toDistanceQuery = (pointQuery: string) => {
	return `${pointQuery}.STDistance([location])`
}
