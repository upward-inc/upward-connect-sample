import { z } from "zod"
import "zod-openapi/extend"

export const EqualOperatorSchema = z.literal("eq").openapi({
	description: "Equal (=)",
})

export const MatchOperatorSchema = z.literal("match").openapi({
	description: "Match (LIKE '%abc%')",
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

export const IncludeOperatorSchema = z.literal("include").openapi({
	description: "Include",
})

export const IsSetOperatorSchema = z.literal("is_set").openapi({
	description: "Is Set",
})

export const OperatorSchema = z.union([
	EqualOperatorSchema,
	MatchOperatorSchema,
	StartsWithOperatorSchema,
	EndsWithOperatorSchema,
	GraterThanOperatorSchema,
	GraterThanOrEqualOperatorSchema,
	LessThanOperatorSchema,
	LessThanOrEqualOperatorSchema,
	IncludeOperatorSchema,
	IsSetOperatorSchema,
])

export type EqualOperator = z.infer<typeof EqualOperatorSchema>
export type MatchOperator = z.infer<typeof MatchOperatorSchema>
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
export type IncludeOperator = z.infer<typeof IncludeOperatorSchema>
export type IsSetOperator = z.infer<typeof IsSetOperatorSchema>
export type Operator = z.infer<typeof OperatorSchema>
