import { format } from "@formkit/tempo"
import { z } from "../libs/zod"
import { escapeStringValue } from "../utility/sql"
import type { Comparison, RecordReferenceValue } from "./comparison"
import { EntityItemSubTypeSchema, EntityItemTypeSchema } from "./entity-item"
import {
	type Filter,
	NestableFilterSchema,
	isAndFilter,
	isComparison,
	isOrFilter,
} from "./filter"
import type {
	EqualOperator,
	GreaterThanOperator,
	GreaterThanOrEqualOperator,
	IncludesOperator,
	LessThanOperator,
	LessThanOrEqualOperator,
	LikeOperator,
} from "./operator"
import { LimitSchema, OffsetSchema, OrderBySchema } from "./paging"

export const FieldSchema = z.object({
	table_name: z.string().meta({
		description: "テーブル名",
		example: "profile",
	}),
	column_name: z.string().meta({
		description: "カラム名",
		example: "name",
	}),
	alias_name: z.string().meta({
		description: "取得名（フィールド名）",
		example: "profile_name",
	}),
	type: EntityItemTypeSchema,
	sub_type: EntityItemSubTypeSchema.nullish(),
	reference_entities: z.array(z.string()).nullish(),
})

export const SelectClauseSchema = z
	.array(FieldSchema)
	.transform((fields) => {
		// 経緯度フィールドの変換
		const locationKeywords = ["latitude", "longitude"]
		return fields.map((field) => {
			if (locationKeywords.includes(field.column_name)) {
				const replacedField = field.column_name
					.replace("latitude", "[location].[Lat]")
					.replace("longitude", "[location].[Long]")
				return `[${field.table_name}].${replacedField} AS [${field.alias_name}]`
			}
			return `[${field.table_name}].[${field.column_name}] AS [${field.alias_name}]`
		})
	})
	.transform((safeFields) => {
		return `SELECT ${safeFields.join(", ")}`
	})

export const WhereClauseSchema = z
	.object({
		items: z.array(FieldSchema),
		filter: NestableFilterSchema.optional(),
	})
	.transform(({ items, filter }) => {
		const predicates = getWherePredicates(items, filter)
		if (!predicates) {
			return ""
		}

		return `WHERE ${predicates}`
	})

const getWherePredicates = (items: Field[], filter?: Filter): string | null => {
	if (!filter) {
		return null
	}
	if (isComparison(filter)) {
		return comparisonToPredicate(items, filter)
	}

	if (isAndFilter(filter)) {
		const predicates = filter.and
			.map((children) => getWherePredicates(items, children))
			.filter((predicate): predicate is string => predicate !== null)

		if (!predicates.length) {
			return null
		}

		return `(${predicates.join(" AND ")})`
	}

	if (isOrFilter(filter)) {
		const predicates = filter.or
			.map((children) => getWherePredicates(items, children))
			.filter((predicate): predicate is string => predicate !== null)

		if (!predicates.length) {
			return null
		}

		return `(${predicates.join(" OR ")})`
	}

	return null
}

export const GroupByClauseSchema = z
	.array(FieldSchema)
	.optional()
	.transform((fields) => {
		const safeFieldNames = fields?.map(
			(field) => `[${field.table_name}].[${field.column_name}]`,
		)
		return fields ? `GROUP BY ${safeFieldNames?.join(", ")}` : null
	})

export const OrderByClauseSchema = OrderBySchema.optional().transform(
	(orderBy) => {
		if (!orderBy?.length) {
			return ""
		}
		return `ORDER BY ${orderBy
			.map(({ field, direction }) => {
				return `[${field}] ${direction}`
			})
			.join(", ")}`
	},
)

export const PagingClauseSchema = z
	.object({
		limit: LimitSchema.optional(),
		offset: OffsetSchema.optional(),
	})
	.transform(({ limit, offset }) => {
		const limitClause = limit ? `FETCH NEXT ${limit} ROWS ONLY` : null
		const offsetClause = `OFFSET ${offset ?? 0} ROWS`
		return [offsetClause, limitClause].filter((s) => s).join(" ")
	})

const comparisonToPredicate = (items: Field[], filter: Comparison) => {
	// フィールドが存在しない場合は検索条件に含めない
	const item = items.find((item) => item.alias_name === filter.field)
	if (!item) {
		return null
	}

	// 値設定有無比較
	if (filter.filter_type === "is_set") {
		return withPredicatePrefix(
			filter.is_not,
			getIsSetComparisonPredicate(item.table_name, item.type, item.column_name),
		)
	}

	// 項目: テキスト（値: 文字列）
	if (
		item.type === "text" &&
		filter.filter_type === "string" &&
		filter.operator !== "includes"
	) {
		return withPredicatePrefix(
			filter.is_not,
			getSimpleComparisonPredicate(
				item.table_name,
				item.column_name,
				item.type,
				filter.operator,
				filter.value,
			),
		)
	}

	// 項目: 数値（値: 数値）
	if (item.type === "numeric" && filter.filter_type === "numeric") {
		return withPredicatePrefix(
			filter.is_not,
			getSimpleComparisonPredicate(
				item.table_name,
				item.column_name,
				item.type,
				filter.operator,
				filter.value,
			),
		)
	}

	// 項目: 真偽値（値: 真偽値）
	if (item.type === "boolean" && filter.filter_type === "boolean") {
		return withPredicatePrefix(
			filter.is_not,
			getSimpleComparisonPredicate(
				item.table_name,
				item.column_name,
				item.type,
				filter.operator,
				filter.value,
			),
		)
	}

	// 項目: 日付（値: 文字列）
	if (
		item.type === "date" &&
		filter.filter_type === "string" &&
		filter.operator !== "includes"
	) {
		// SQL Serverにて、datetime型のみ形式が厳密であるためフォーマットを実施
		const value =
			item.sub_type === "datetime"
				? format({
						date: filter.value,
						format: "YYYY-MM-DD HH:mm:ss",
						tz: "UTC",
					})
				: filter.value

		return withPredicatePrefix(
			filter.is_not,
			getSimpleComparisonPredicate(
				item.table_name,
				item.column_name,
				item.type,
				filter.operator,
				value,
			),
		)
	}

	// 項目: オプション（値: 文字列）
	if (
		item.type === "option" &&
		filter.filter_type === "string" &&
		(filter.operator === "eq" || filter.operator === "includes")
	) {
		return withPredicatePrefix(
			filter.is_not,
			getOptionComparisonPredicate(
				item.table_name,
				item.column_name,
				filter.operator,
				filter.value,
				item.sub_type,
			),
		)
	}

	// 項目: 参照（値: 文字列 or オブジェクト）
	if (
		item.type === "reference" &&
		(filter.filter_type === "string" || filter.filter_type === "object") &&
		(filter.operator === "eq" || filter.operator === "includes")
	) {
		const value =
			typeof filter.value === "string"
				? {
						entity_name: item.reference_entities?.at(0) ?? "",
						id: filter.value,
					}
				: filter.value

		return withPredicatePrefix(
			filter.is_not,
			getReferenceComparisonPredicate(
				item.table_name,
				item.column_name,
				filter.operator,
				value,
				item.sub_type,
			),
		)
	}

	return null
}

const getSimpleComparisonPredicate = (
	tableName: Field["table_name"],
	columnName: Field["column_name"],
	itemType: Field["type"],
	operator:
		| EqualOperator
		| LikeOperator
		| GreaterThanOperator
		| GreaterThanOrEqualOperator
		| LessThanOperator
		| LessThanOrEqualOperator,
	value: string | number | boolean,
) => {
	if (itemType === "option" || itemType === "reference") {
		return null
	}

	const safeColumnName = `[${tableName}].[${columnName}]`
	const operators: Record<
		typeof operator,
		{
			operator: string
		}
	> = {
		eq: { operator: "=" },
		like: { operator: "LIKE" },
		gt: { operator: ">" },
		gte: { operator: ">=" },
		lt: { operator: "<" },
		lte: { operator: "<=" },
	}

	const { operator: sqlOperator } = operators[operator]

	const valueExpressions: Record<
		"text" | "numeric" | "boolean" | "date",
		string | number
	> = {
		text: typeof value === "string" ? escapeStringValue(value) : "''",
		numeric: Number(value),
		boolean: value ? 1 : 0,
		date: `'${value}'`,
	}

	const isNotNullExpression = `${safeColumnName} IS NOT NULL`
	const valueExpression = valueExpressions[itemType]

	return `${isNotNullExpression} AND ${safeColumnName} ${sqlOperator} ${valueExpression}`
}

const getOptionComparisonPredicate = (
	tableName: Field["table_name"],
	columnName: Field["column_name"],
	operator: EqualOperator | IncludesOperator,
	value: string,
	subType?: Field["sub_type"],
) => {
	const safeColumnName = `[${tableName}].[${columnName}]`
	const isNotNullExpression = `${safeColumnName} IS NOT NULL`
	const jsonExpression = [
		"CASE",
		`WHEN ISJSON(${safeColumnName}) = 1 THEN ${safeColumnName}`,
		`ELSE '[' + ${safeColumnName} + ']'`,
		"END",
	].join(" ")

	const valueCondition = `WHERE value = '${value}'`

	// multi type + eqの場合のみ完全一致チェック（配列要素数1かつ値が一致）が必要
	if (operator === "eq" && subType === "multi") {
		return `${isNotNullExpression} AND ${getJsonArrayExactMatchPredicate(jsonExpression, valueCondition)}`
	}

	// 単一オプションのカラムには単一の値しか設定されない前提であるため、
	// （single + eq、または includes）は値が含まれているかのチェックで十分
	return `${isNotNullExpression} AND ${getJsonArrayIncludesPredicate(jsonExpression, valueCondition)}`
}

const getReferenceComparisonPredicate = (
	tableName: Field["table_name"],
	columnName: Field["column_name"],
	operator: EqualOperator | IncludesOperator,
	value: RecordReferenceValue,
	subType?: Field["sub_type"],
) => {
	const safeColumnName = `[${tableName}].[${columnName}]`
	const withClause = "WITH (entity_name NVARCHAR(MAX), id NVARCHAR(MAX))"
	const valueCondition = `${withClause} WHERE entity_name = '${value.entity_name}' AND id = '${value.id}'`

	// multi type + eqの場合のみ完全一致チェック（配列要素数1かつ値が一致）が必要
	if (operator === "eq" && subType === "multi") {
		return getJsonArrayExactMatchPredicate(safeColumnName, valueCondition)
	}

	// 単一参照のカラムには単一の値しか設定されない前提であるため、
	// （single + eq、または includes）は値が含まれているかのチェックで十分
	return getJsonArrayIncludesPredicate(safeColumnName, valueCondition)
}

const getIsSetComparisonPredicate = (
	tableName: Field["table_name"],
	itemType: Field["type"],
	columnName: Field["column_name"],
) => {
	const safeColumnName = `[${tableName}].[${columnName}]`
	const predicates: Record<Field["type"], string> = {
		text: `TRIM(ISNULL(${safeColumnName}, '')) != ''`,
		numeric: `ISNULL(${safeColumnName}, 0) != 0`,
		boolean: `ISNULL(${safeColumnName}, 0) != 0`,
		date: `ISNULL(${safeColumnName}, '') != ''`,
		option: `(SELECT COUNT(*) FROM OPENJSON(CASE WHEN ISJSON(${safeColumnName}) = 1 THEN ${safeColumnName} ELSE '[' + ${safeColumnName} + ']' END)) > 0`,
		reference: `(SELECT COUNT(*) FROM OPENJSON(${safeColumnName})) > 0`,
	}

	return predicates[itemType]
}

const withPredicatePrefix = (isNot: boolean, predicate: string | null) => {
	if (!predicate) {
		return null
	}

	const predicatePrefix = isNot ? "NOT" : ""
	return `${predicatePrefix} (${predicate})`
}

/**
 * JSON配列が要素数1かつ指定条件を満たすことをチェックする条件式を生成
 */
const getJsonArrayExactMatchPredicate = (
	columnExpression: string,
	valueCondition: string,
): string => {
	const countSubQuery = `SELECT COUNT(*) FROM OPENJSON(${columnExpression})`
	const valueSubQuery = `SELECT * FROM OPENJSON(${columnExpression}) ${valueCondition}`
	return `(${countSubQuery}) = 1 AND EXISTS (${valueSubQuery})`
}

/**
 * JSON配列が指定条件を満たす要素を含むことをチェックする条件式を生成
 */
const getJsonArrayIncludesPredicate = (
	columnExpression: string,
	valueCondition: string,
): string => {
	const subQuery = `SELECT * FROM OPENJSON(${columnExpression}) ${valueCondition}`
	return `EXISTS (${subQuery})`
}

export type Field = z.infer<typeof FieldSchema>
