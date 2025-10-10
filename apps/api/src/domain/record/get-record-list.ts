import { format } from "@formkit/tempo"
import { prisma } from "../../libs/prisma"
import type { JsonValue } from "../../schema/common"
import type { EntityItem } from "../../schema/entity-item"
import { isAndFilter, isBaseFilter, isOrFilter } from "../../schema/filter"
import type {
	GetRecordListQuery,
	GetRecordListResponse,
} from "../../schema/record"
import {
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
	entity: string
	id: string
}

export const getRecordList = async (
	entity_name: string,
	{ fields, filter, group_by, order_by, limit, offset }: GetRecordListQuery,
): Promise<GetRecordListResponse> => {
	const entityItems = await getEntityItemList(entity_name)
	const entityItemMap = new Map(entityItems.map((item) => [item.name, item]))

	const collectFilterFields = (
		filter: GetRecordListQuery["filter"],
	): string[] => {
		if (!filter) return []

		if (isBaseFilter(filter)) {
			return [filter.field]
		}

		if (isAndFilter(filter)) {
			return filter.and.flatMap((f) =>
				collectFilterFields(f as GetRecordListQuery["filter"]),
			)
		}
		if (isOrFilter(filter)) {
			return filter.or.flatMap((f) =>
				collectFilterFields(f as GetRecordListQuery["filter"]),
			)
		}

		return []
	}

	const needFormulaField = [
		...fields,
		...collectFilterFields(filter),
		...(group_by ?? []),
		...(order_by?.map(({ field }) => field) ?? []),
	].some((field) => {
		const item = entityItemMap.get(field)
		return !!item?.is_formula
	})

	const selectFields = fields.filter((field) => {
		return !!entityItems.find(({ name }) => name === field)
	})

	const selectClause = SelectClauseSchema.parse(selectFields)

	// 数式が必要な場合のみビューを参照
	const fromClause = `FROM [${entity_name}${needFormulaField ? "_view" : ""}]`

	const whereClause = WhereClauseSchema.parse({ items: entityItems, filter })

	const groupByFields = group_by?.filter((field) => {
		return !!entityItems.find(({ name }) => name === field)
	})

	const groupByClause = groupByFields
		? GroupByClauseSchema.parse(groupByFields)
		: null

	const hasGroupByFields = groupByFields && groupByFields.length > 0

	const baseOrderBy = order_by
		? order_by
		: hasGroupByFields
			? groupByFields.map((field) => ({ field, direction: "asc" as const }))
			: []

	const hasIdInOrderBy = baseOrderBy.some(({ field }) => field === "id")
	const finalOrderBy = hasGroupByFields
		? baseOrderBy
		: hasIdInOrderBy
			? baseOrderBy
			: [...baseOrderBy, { field: "id", direction: "asc" as const }]

	const orderByClause = OrderByClauseSchema.parse(finalOrderBy)

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

	const data = await covertRecords(records, fields, entityItemMap)
	const hasNextPage = limit ? fetchDataResult.length > limit : false
	const totalSize = totalSizeResult.at(0)?.count ?? 0

	return {
		has_next_page: hasNextPage,
		total_size: totalSize,
		data,
	}
}

const isArray = <T>(maybeArray: T | readonly T[]): maybeArray is T[] => {
	return Array.isArray(maybeArray)
}

// 一部のフィールド型において、Prisma($queryRawUnsafe)経由で取得したデータ型と結果として返却したいデータ型が一致しないので、適切な型に変換する
const covertRecords = async (
	records: DBRecord[],
	queryFields: string[],
	entityItemMap: Map<string, EntityItem>,
) => {
	const referenceRecords = await getReferenceRecords(records, entityItemMap)

	return records.map((row) => {
		let data: Record<string, JsonValue | Date> = {}

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

					const getValue = (entity: string, id: string) => {
						return {
							entity,
							id,
							title: referenceRecords.get(entity)?.get(id) ?? "",
						}
					}

					if (!isArray(references)) {
						value = getValue(references.entity, references.id)
					} else {
						value = references.map((reference) =>
							getValue(reference.entity, reference.id),
						)
					}
				}
			}

			data = { ...data, [field]: value ?? null }
		}

		return data
	})
}

const getReferenceRecords = async (
	records: DBRecord[],
	entityItemMap: Map<string, EntityItem>,
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
			.filter(({ name, type }) => type === "reference" && !!record[name])
			.flatMap(({ name }) => {
				const value = record[name]
				const references: Reference | Reference[] = JSON.parse(String(value))
				return isArray(references) ? references : [references]
			})
	})

	// エンティティ毎の参照されているID
	const idsByEntity = new Map<string, Set<string>>()
	for (const { entity, id } of references) {
		if (!idsByEntity.has(entity)) {
			idsByEntity.set(entity, new Set())
		}
		idsByEntity.get(entity)?.add(id)
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
