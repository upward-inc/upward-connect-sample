import { z } from "../libs/zod"
import {
	ComparisonSchema,
	type NumericFieldComparison,
	type TextFieldComparison,
} from "./comparison"
import { ToJsonObjectSchema } from "./utility"

type TextFieldFilterSample = Omit<TextFieldComparison, "comparison_type">
type NumericFieldFilterSample = Omit<NumericFieldComparison, "comparison_type">

const singleFilterExample: TextFieldFilterSample = {
	field: "status",
	operator: "eq",
	value: "active",
	is_not: false,
}

const andFilterExample: Array<
	TextFieldFilterSample | NumericFieldFilterSample
> = [
	{ field: "category", operator: "eq", value: "seafood", is_not: false },
	{ field: "price", operator: "lt", value: 500, is_not: false },
]

const orFilterExample: Array<TextFieldFilterSample> = [
	{ field: "category", operator: "eq", value: "seafood", is_not: false },
	{ field: "category", operator: "eq", value: "alcohol", is_not: false },
]

// AND条件
export const AndFilterSchema = z
	.object({
		and: z.array(ComparisonSchema).meta({
			description: "条件オブジェクト配列",
			example: andFilterExample,
		}),
	})
	.meta({
		description: "AND論理演算子による条件オブジェクト配列",
	})

// OR条件
export const OrFilterSchema = z
	.object({
		or: z.array(ComparisonSchema).meta({
			description: "条件オブジェクト配列",
			example: orFilterExample,
		}),
	})
	.meta({
		description: "OR論理演算子による条件オブジェクト配列",
	})

// 入れ子構造可能なAND条件（2階層目）
export const AndFilterLv2Schema = z
	.object({
		and: z.array(z.union([ComparisonSchema, AndFilterSchema, OrFilterSchema])),
	})
	.meta({
		description: "AND論理演算子による条件オブジェクト配列（入れ子構造可）",
	})

// 入れ子構造可能なOR条件（2階層目）
export const OrFilterLv2Schema = z
	.object({
		or: z.array(z.union([ComparisonSchema, AndFilterSchema, OrFilterSchema])),
	})
	.meta({
		description: "OR論理演算子による条件オブジェクト配列（入れ子構造可）",
	})

// 入れ子構造可能なAND条件（トップレベル）
export const NestableAndFilterSchema = z
	.object({
		and: z
			.array(
				z.union([
					ComparisonSchema,
					AndFilterSchema,
					OrFilterSchema,
					AndFilterLv2Schema,
					OrFilterLv2Schema,
				]),
			)
			.meta({
				description: "条件オブジェクト配列（入れ子構造可）",
				examples: [
					andFilterExample,
					[
						singleFilterExample,
						{
							or: orFilterExample,
						},
					],
				],
			}),
	})
	.meta({
		description: "AND論理演算子による条件オブジェクト配列（入れ子構造可）",
	})

// 入れ子構造可能なOR条件（トップレベル）
export const NestableOrFilterSchema = z
	.object({
		or: z
			.array(
				z.union([
					ComparisonSchema,
					AndFilterSchema,
					OrFilterSchema,
					AndFilterLv2Schema,
					OrFilterLv2Schema,
				]),
			)
			.meta({
				description: "条件オブジェクト配列（入れ子構造可）",
				examples: [
					orFilterExample,
					[
						singleFilterExample,
						{
							and: andFilterExample,
						},
					],
				],
			}),
	})
	.meta({
		description: "OR論理演算子による条件オブジェクト配列（入れ子構造可）",
	})

// フィルター条件
export const NestableFilterSchema = z
	.union([NestableAndFilterSchema, NestableOrFilterSchema])
	.meta({
		description: "フィルター条件（最大3階層の入れ子構造可）",
		examples: [
			{
				and: andFilterExample,
			},
			{
				or: orFilterExample,
			},
			{
				and: [
					singleFilterExample,
					{
						or: orFilterExample,
					},
				],
			},
			{
				or: [
					singleFilterExample,
					{
						and: andFilterExample,
					},
				],
			},
		],
	})

export const NestableFilterQuerySchema =
	ToJsonObjectSchema(NestableFilterSchema)

// フィルタータイプの判別関数
export function isComparison(
	filter: unknown,
): filter is z.infer<typeof ComparisonSchema> {
	return (
		filter !== null && typeof filter === "object" && "filter_type" in filter
	)
}

export function isAndFilter(
	filter: unknown,
): filter is z.infer<typeof NestableAndFilterSchema> {
	return filter !== null && typeof filter === "object" && "and" in filter
}

export function isOrFilter(
	filter: unknown,
): filter is z.infer<typeof NestableOrFilterSchema> {
	return filter !== null && typeof filter === "object" && "or" in filter
}

export function collectFilterFields(filter?: Filter): string[] {
	if (isComparison(filter)) {
		return [filter.field]
	}

	if (isAndFilter(filter)) {
		return filter.and.flatMap((f) => collectFilterFields(f))
	}
	if (isOrFilter(filter)) {
		return filter.or.flatMap((f) => collectFilterFields(f))
	}

	return []
}

export type Filter = z.infer<
	typeof NestableFilterSchema | typeof ComparisonSchema
>
