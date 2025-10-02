import { z } from "zod"
import "zod-openapi/extend"

export const EqualOperatorSchema = z.literal("eq").openapi({
	description: "Equal (=)",
})

export const ContainsOperatorSchema = z.literal("contains").openapi({
	description: "Contains (LIKE '%abc%')",
})

export const StartsWithOperatorSchema = z.literal("starts_with").openapi({
	description: "Starts With (LIKE 'abc%')",
})

export const EndsWithOperatorSchema = z.literal("ends_with").openapi({
	description: "Ends With (LIKE '%abc')",
})

export const GraterThanOperatorSchema = z.literal("gt").openapi({
	description: "Grater Than (>)",
})

export const GraterThanOrEqualOperatorSchema = z.literal("gte").openapi({
	description: "Grater Than Or Equal (>=)",
})

export const LessThanOperatorSchema = z.literal("lt").openapi({
	description: "Less Than (<)",
})

export const LessThanOrEqualOperatorSchema = z.literal("lte").openapi({
	description: "Less Than Or Equal (<=)",
})

export const IncludesOperatorSchema = z.literal("includes").openapi({
	description: "Includes",
})

export const IsSetOperatorSchema = z.literal("is_set").openapi({
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
