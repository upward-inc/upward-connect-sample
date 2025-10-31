import { z } from "../libs/zod"

export const EqualOperatorSchema = z.literal("eq").meta({
	description: "Equal (=)",
})

export const LikeOperatorSchema = z.literal("like").meta({
	description: "Like (LIKE pattern)",
})

export const GreaterThanOperatorSchema = z.literal("gt").meta({
	description: "Greater Than (>)",
})

export const GreaterThanOrEqualOperatorSchema = z.literal("gte").meta({
	description: "Greater Than Or Equal (>=)",
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
	GreaterThanOperatorSchema,
	GreaterThanOrEqualOperatorSchema,
	LessThanOperatorSchema,
	LessThanOrEqualOperatorSchema,
	IncludesOperatorSchema,
	IsSetOperatorSchema,
])

export type EqualOperator = z.infer<typeof EqualOperatorSchema>
export type LikeOperator = z.infer<typeof LikeOperatorSchema>
export type GreaterThanOperator = z.infer<typeof GreaterThanOperatorSchema>
export type GreaterThanOrEqualOperator = z.infer<
	typeof GreaterThanOrEqualOperatorSchema
>
export type LessThanOperator = z.infer<typeof LessThanOperatorSchema>
export type LessThanOrEqualOperator = z.infer<
	typeof LessThanOrEqualOperatorSchema
>
export type IncludesOperator = z.infer<typeof IncludesOperatorSchema>
export type IsSetOperator = z.infer<typeof IsSetOperatorSchema>
export type Operator = z.infer<typeof OperatorSchema>
