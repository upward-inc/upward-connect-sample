import { z } from "../libs/zod"
import {
	BooleanFieldComparisonSchema,
	DateFieldComparisonSchema,
	IsSetComparisonSchema,
	type NumericFieldComparison,
	NumericFieldComparisonSchema,
	OptionFieldComparisonSchema,
	ReferenceFieldObjectComparisonSchema,
	ReferenceFieldStringComparisonSchema,
	type TextFieldComparison,
	TextFieldComparisonSchema,
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

// 単一の条件
export const BaseFilterSchema = z
	.union([
		z
			.union([
				TextFieldComparisonSchema,
				DateFieldComparisonSchema,
				OptionFieldComparisonSchema,
				ReferenceFieldStringComparisonSchema,
			])
			.transform((data) => ({
				filter_type: "string" as const,
				...data,
			})),
		NumericFieldComparisonSchema.transform((data) => ({
			filter_type: "numeric" as const,
			...data,
		})),
		BooleanFieldComparisonSchema.transform((data) => ({
			filter_type: "boolean" as const,
			...data,
		})),
		ReferenceFieldObjectComparisonSchema.transform((data) => ({
			filter_type: "object" as const,
			...data,
		})),
		IsSetComparisonSchema.transform((data) => ({
			filter_type: "is_set" as const,
			...data,
		})),
	])
	.meta({
		description: "単一の条件オブジェクト",
	})

// AND条件
export const AndFilterSchema = z
	.object({
		and: z.array(BaseFilterSchema).meta({
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
		or: z.array(BaseFilterSchema).meta({
			description: "条件オブジェクト配列",
			example: orFilterExample,
		}),
	})
	.meta({
		description: "OR論理演算子による条件オブジェクト配列",
	})

// AND条件（入れ子構造可）
export const NestableAndFilterSchema = z
	.object({
		and: z
			.array(z.union([BaseFilterSchema, AndFilterSchema, OrFilterSchema]))
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

// OR条件（入れ子構造可）
export const NestableOrFilterSchema = z
	.object({
		or: z
			.array(z.union([BaseFilterSchema, AndFilterSchema, OrFilterSchema]))
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
		description: "フィルター条件（最大2階層の入れ子構造可）",
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
export function isBaseFilter(
	filter: unknown,
): filter is z.infer<typeof BaseFilterSchema> {
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
