import { z } from "../libs/zod"

export const EqualOperatorSchema = z.literal("eq").meta({
	description: "Equal (=)",
})

export const LikeOperatorSchema = z.literal("like").meta({
	description: "Like (LIKE pattern) - 曖昧検索",
})

export const GraterThanOperatorSchema = z.literal("gt").meta({
	description: "Grater Than (>)",
})

export const GraterThanOrEqualOperatorSchema = z.literal("gte").meta({
	description: "Grater Than Or Equal (>=)",
})

export const LessThanOperatorSchema = z.literal("lt").meta({
	description: "Less Than (<)",
})

export const LessThanOrEqualOperatorSchema = z.literal("lte").meta({
	description: "Less Than Or Equal (<=)",
})

export const IncludesOperatorSchema = z.literal("includes").meta({
	description: "Includes",
})

export const IsSetOperatorSchema = z.literal("is_set").meta({
	description: "Is Set",
})

export const OperatorSchema = z.union([
	EqualOperatorSchema,
	LikeOperatorSchema,
	GraterThanOperatorSchema,
	GraterThanOrEqualOperatorSchema,
	LessThanOperatorSchema,
	LessThanOrEqualOperatorSchema,
	IncludesOperatorSchema,
	IsSetOperatorSchema,
])

export type EqualOperator = z.infer<typeof EqualOperatorSchema>
export type LikeOperator = z.infer<typeof LikeOperatorSchema>
export type GraterThanOperator = z.infer<typeof GraterThanOperatorSchema>
export type GraterThanOrEqualOperator = z.infer<
	typeof GraterThanOrEqualOperatorSchema
>
export type LessThanOperator = z.infer<typeof LessThanOperatorSchema>
export type LessThanOrEqualOperator = z.infer<
	typeof LessThanOrEqualOperatorSchema
>
export type IncludesOperator = z.infer<typeof IncludesOperatorSchema>
export type IsSetOperator = z.infer<typeof IsSetOperatorSchema>
export type Operator = z.infer<typeof OperatorSchema>
