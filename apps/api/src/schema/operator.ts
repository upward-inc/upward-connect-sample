import { z } from "zod"

export const EqualOperatorSchema = z.literal("eq").meta({
	description: "Equal (=)",
})

export const ContainsOperatorSchema = z.literal("contains").meta({
	description: "Contains (LIKE '%abc%')",
})

export const StartsWithOperatorSchema = z.literal("starts_with").meta({
	description: "Starts With (LIKE 'abc%')",
})

export const EndsWithOperatorSchema = z.literal("ends_with").meta({
	description: "Ends With (LIKE '%abc')",
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
	ContainsOperatorSchema,
	StartsWithOperatorSchema,
	EndsWithOperatorSchema,
	GraterThanOperatorSchema,
	GraterThanOrEqualOperatorSchema,
	LessThanOperatorSchema,
	LessThanOrEqualOperatorSchema,
	IncludesOperatorSchema,
	IsSetOperatorSchema,
])

export type EqualOperator = z.infer<typeof EqualOperatorSchema>
export type ContainsOperator = z.infer<typeof ContainsOperatorSchema>
export type StartsWithOperator = z.infer<typeof StartsWithOperatorSchema>
export type EndsWithOperator = z.infer<typeof EndsWithOperatorSchema>
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
