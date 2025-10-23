import { format } from "@formkit/tempo"
import { z } from "../libs/zod"
import type { RecordReferenceValue } from "./comparison"
import { type EntityItem, EntityItemSchema } from "./entity-item"
import {
	type BaseFilterSchema,
	NestableFilterSchema,
	isAndFilter,
	isBaseFilter,
	isOrFilter,
} from "./filter"
import type {
	ContainsOperator,
	EndsWithOperator,
	EqualOperator,
	GraterThanOperator,
	GraterThanOrEqualOperator,
	IncludesOperator,
	LessThanOperator,
	LessThanOrEqualOperator,
	StartsWithOperator,
} from "./operator"
import { LimitSchema, OffsetSchema, OrderBySchema } from "./paging"

export const SelectClauseSchema = z.array(z.string()).transform((fields) => {
	// Handle SQL Server reserved keywords by wrapping them in brackets
	const safeFields = fields.map((field) => `[${field}]`)
	return `SELECT ${safeFields.join(", ")}`
})

export const WhereClauseSchema = z
	.object({
		items: z.array(EntityItemSchema),
		filter: NestableFilterSchema.optional(),
	})
	.transform(({ items, filter }) => {
		const predicates = getWherePredicates(items, filter)
		if (!predicates) {
			return ""
		}

		return `WHERE ${predicates}`
	})

const getWherePredicates = (
	items: EntityItem[],
	filter?: z.infer<typeof NestableFilterSchema>,
): string | null => {
	if (!filter) {
		return null
	}
	if (isBaseFilter(filter)) {
		return baseFilterToPredicate(items, filter)
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
	.array(z.string())
	.optional()
	.transform((fields) => {
		return fields ? `GROUP BY ${fields.join(", ")}` : null
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

const baseFilterToPredicate = (
	items: EntityItem[],
	filter: z.infer<typeof BaseFilterSchema>,
) => {
	// フィールドが存在しない場合は検索条件に含めない
	const item = items.find((item) => item.name === filter.field)
	if (!item) {
		return null
	}

	// 値設定有無比較
	if (filter.filter_type === "is_set") {
		return withPredicatePrefix(
			filter.is_not,
			getIsSetComparisonPredicate(item.type, filter.field, item.sub_type),
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
				filter.field,
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
				filter.field,
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
				filter.field,
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
				filter.field,
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
				filter.field,
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
				filter.field,
				filter.operator,
				value,
				item.sub_type,
			),
		)
	}

	return null
}

const getSimpleComparisonPredicate = (
	fieldName: string,
	itemType: EntityItem["type"],
	operator:
		| EqualOperator
		| ContainsOperator
		| StartsWithOperator
		| EndsWithOperator
		| GraterThanOperator
		| GraterThanOrEqualOperator
		| LessThanOperator
		| LessThanOrEqualOperator,
	value: string | number | boolean,
) => {
	if (itemType === "option" || itemType === "reference") {
		return null
	}

	const safeColumnName = `[${fieldName}]`
	const operators: Record<
		typeof operator,
		{
			operator: string
			wildcard?: { prefix?: string; suffix?: string }
		}
	> = {
		eq: { operator: "=" },
		contains: { operator: "LIKE", wildcard: { prefix: "%", suffix: "%" } },
		starts_with: { operator: "LIKE", wildcard: { suffix: "%" } },
		ends_with: { operator: "LIKE", wildcard: { prefix: "%" } },
		gt: { operator: ">" },
		gte: { operator: ">=" },
		lt: { operator: "<" },
		lte: { operator: "<=" },
	}

	const { operator: sqlOperator, wildcard } = operators[operator]

	const valueExpressions: Record<
		"text" | "numeric" | "boolean" | "date",
		string | number
	> = {
		text: `'${wildcard?.prefix ?? ""}${value}${wildcard?.suffix ?? ""}'`,
		numeric: Number(value),
		boolean: value ? 1 : 0,
		date: `'${value}'`,
	}

	const isNotNullExpression = `${safeColumnName} IS NOT NULL`
	const valueExpression = valueExpressions[itemType]

	return `${isNotNullExpression} AND ${safeColumnName} ${sqlOperator} ${valueExpression}`
}

const getOptionComparisonPredicate = (
	fieldName: string,
	operator: EqualOperator | IncludesOperator,
	value: string,
	subType?: EntityItem["sub_type"],
) => {
	const safeColumnName = `[${fieldName}]`
	const isNotNullExpression = `${safeColumnName} IS NOT NULL`
	const jsonExpression = [
		"CASE",
		`WHEN ISJSON(${safeColumnName}) = 1 THEN ${safeColumnName}`,
		`ELSE '[' + ${safeColumnName} + ']'`,
		"END",
	].join(" ")

	if (operator === "eq" && subType === "multi") {
		// multi の eq: 配列の要素数が1で、その値が指定値と一致すること
		const countSubQuery = `SELECT COUNT(*) FROM OPENJSON(${jsonExpression})`
		const valueSubQuery = `SELECT * FROM OPENJSON(${jsonExpression}) WHERE value = '${value}'`
		return `${isNotNullExpression} AND (${countSubQuery}) = 1 AND EXISTS (${valueSubQuery})`
	}

	// single の eq または includes: 対象の値を含む
	const subQuery = `SELECT * FROM OPENJSON(${jsonExpression}) WHERE value = '${value}'`
	return `${isNotNullExpression} AND EXISTS (${subQuery})`
}

const getReferenceComparisonPredicate = (
	fieldName: string,
	operator: EqualOperator | IncludesOperator,
	value: RecordReferenceValue,
	subType?: EntityItem["sub_type"],
) => {
	const safeColumnName = `[${fieldName}]`

	if (operator === "eq" && subType === "multi") {
		// multi の eq: 配列の要素数が1で、その値が指定値と一致すること
		const countSubQuery = `SELECT COUNT(*) FROM OPENJSON(${safeColumnName})`
		const valueSubQuery = [
			`SELECT * FROM OPENJSON(${safeColumnName})`,
			"WITH (entity_name NVARCHAR(MAX), id NVARCHAR(MAX))",
			`WHERE entity_name = '${value.entity_name}' AND id = '${value.id}'`,
		].join(" ")
		return `(${countSubQuery}) = 1 AND EXISTS (${valueSubQuery})`
	}

	// single の eq または includes: 対象の値を含む（単一参照でも配列として保存されているため）
	const subQuery = [
		`SELECT * FROM OPENJSON(${safeColumnName})`,
		"WITH (entity_name NVARCHAR(MAX), id NVARCHAR(MAX))",
		`WHERE entity_name = '${value.entity_name}' AND id = '${value.id}'`,
	].join(" ")
	return `EXISTS (${subQuery})`
}

const getIsSetComparisonPredicate = (
	itemType: EntityItem["type"],
	fieldName: string,
	subType?: EntityItem["sub_type"],
) => {
	const safeColumnName = `[${fieldName}]`

	// reference型の場合はsubTypeによって判定を分岐
	if (itemType === "reference") {
		if (subType === "multi") {
			// multi: 空配列またはnullを検出（値が設定されていない）
			return `${safeColumnName} IS NULL OR (SELECT COUNT(*) FROM OPENJSON(${safeColumnName})) = 0`
		}
		// single: 配列に要素があるかを検出（値が設定されている）
		return `(SELECT COUNT(*) FROM OPENJSON(${safeColumnName})) > 0`
	}

	const predicates: Record<Exclude<EntityItem["type"], "reference">, string> = {
		text: `TRIM(ISNULL(${safeColumnName}, '')) != ''`,
		numeric: `ISNULL(${safeColumnName}, 0) != 0`,
		boolean: `ISNULL(${safeColumnName}, 0) != 0`,
		date: `ISNULL(${safeColumnName}, '') != ''`,
		option: `(SELECT COUNT(*) FROM OPENJSON(CASE WHEN ISJSON(${safeColumnName}) = 1 THEN ${safeColumnName} ELSE '[' + ${safeColumnName} + ']' END)) > 0`,
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
