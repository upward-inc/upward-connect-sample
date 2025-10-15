import { z } from "../libs/zod"
import {
	ContainsOperatorSchema,
	EndsWithOperatorSchema,
	EqualOperatorSchema,
	GraterThanOperatorSchema,
	GraterThanOrEqualOperatorSchema,
	IncludesOperatorSchema,
	IsSetOperatorSchema,
	LessThanOperatorSchema,
	LessThanOrEqualOperatorSchema,
	StartsWithOperatorSchema,
} from "./operator"

export const FieldSchema = z
	.string()
	.meta({ description: "検索対象のフィールド名", example: "name" })

export const IsNotSchema = z.boolean().meta({ description: "条件の否定" })

export const RecordReferenceValueSchema = z
	.object({
		entity: z.string().meta({ description: "エンティティ名" }),
		id: z.string().meta({ description: "レコードID" }),
	})
	.meta({ description: "レコードへの参照" })

// テキストフィールド比較条件
export const TextFieldComparisonSchema = z
	.object({
		field: FieldSchema,
		operator: z
			.union([
				EqualOperatorSchema,
				ContainsOperatorSchema,
				StartsWithOperatorSchema,
				EndsWithOperatorSchema,
				GraterThanOperatorSchema,
				GraterThanOrEqualOperatorSchema,
				LessThanOperatorSchema,
				LessThanOrEqualOperatorSchema,
			])
			.meta({ description: "演算子" }),
		value: z.string().meta({ description: "検索値", example: "abc" }),
		is_not: IsNotSchema.optional().default(false),
	})
	.transform((data) => ({
		comparison_type: "text" as const,
		...data,
	}))
	.meta({ description: "テキストフィールド比較条件" })

// 数値フィールド比較条件
export const NumericFieldComparisonSchema = z
	.object({
		field: FieldSchema,
		operator: z
			.union([
				EqualOperatorSchema,
				GraterThanOperatorSchema,
				GraterThanOrEqualOperatorSchema,
				LessThanOperatorSchema,
				LessThanOrEqualOperatorSchema,
			])
			.meta({ description: "演算子" }),
		value: z.number().meta({ description: "検索値", example: 123 }),
		is_not: IsNotSchema.optional().default(false),
	})
	.transform((data) => ({
		comparison_type: "numeric" as const,
		...data,
	}))
	.meta({ description: "数値フィールド比較条件" })

// 真偽値フィールド比較条件
export const BooleanFieldComparisonSchema = z
	.object({
		field: FieldSchema,
		operator: EqualOperatorSchema.meta({ description: "演算子" }),
		value: z.boolean().meta({ description: "検索値" }),
		is_not: IsNotSchema.optional().default(false),
	})
	.transform((data) => ({
		comparison_type: "boolean" as const,
		...data,
	}))
	.meta({ description: "真偽値フィールド比較条件" })

// 日付フィールド比較条件
export const DateFieldComparisonSchema = z
	.object({
		field: FieldSchema,
		operator: z
			.union([
				EqualOperatorSchema,
				GraterThanOperatorSchema,
				GraterThanOrEqualOperatorSchema,
				LessThanOperatorSchema,
				LessThanOrEqualOperatorSchema,
			])
			.meta({ description: "演算子" }),
		value: z.string().meta({
			description: "検索値",
			examples: ["2025-01-01", "2025-01-01T12:34:56Z", "12:34:56"],
		}),
		is_not: IsNotSchema.optional().default(false),
	})
	.transform((data) => ({
		comparison_type: "date" as const,
		...data,
	}))
	.meta({ description: "日付フィールド比較条件" })

// オプションフィールド比較条件
export const OptionFieldComparisonSchema = z
	.object({
		field: FieldSchema,
		operator: z
			.union([EqualOperatorSchema, IncludesOperatorSchema])
			.meta({ description: "演算子" }),
		value: z.string().meta({ description: "検索値", example: "finance" }),
		is_not: IsNotSchema.optional().default(false),
	})
	.transform((data) => ({
		comparison_type: "option" as const,
		...data,
	}))
	.meta({ description: "オプションフィールド比較条件" })

// 参照フィールド比較条件（文字列）
export const ReferenceFieldStringComparisonSchema = z
	.object({
		field: FieldSchema,
		operator: z
			.union([EqualOperatorSchema, IncludesOperatorSchema])
			.meta({ description: "演算子" }),
		value: z
			.string()
			.meta({ description: "検索値", example: "account-00000001" }),
		is_not: IsNotSchema.optional().default(false),
	})
	.transform((data) => ({
		comparison_type: "reference_string" as const,
		...data,
	}))
	.meta({ description: "参照フィールド比較条件（文字列）" })

// 参照フィールド比較条件（オブジェクト）
export const ReferenceFieldObjectComparisonSchema = z
	.object({
		field: FieldSchema,
		operator: z
			.union([EqualOperatorSchema, IncludesOperatorSchema])
			.meta({ description: "演算子" }),
		value: RecordReferenceValueSchema.meta({
			description: "検索値",
			example: { entity: "account", id: "account-00000001" },
		}),
		is_not: IsNotSchema.optional().default(false),
	})
	.transform((data) => ({
		comparison_type: "reference_object" as const,
		...data,
	}))
	.meta({ description: "参照フィールド比較条件（オブジェクト）" })

// 値設定有無比較条件
export const IsSetComparisonSchema = z
	.object({
		field: FieldSchema,
		operator: IsSetOperatorSchema.meta({ description: "演算子" }),
		is_not: IsNotSchema.optional().default(false),
	})
	.transform((data) => ({
		comparison_type: "is_set" as const,
		...data,
	}))
	.meta({ description: "値設定有無比較条件" })

export type Field = z.infer<typeof FieldSchema>
export type IsNot = z.infer<typeof IsNotSchema>
export type RecordReferenceValue = z.infer<typeof RecordReferenceValueSchema>
export type TextFieldComparison = z.infer<typeof TextFieldComparisonSchema>
export type NumericFieldComparison = z.infer<
	typeof NumericFieldComparisonSchema
>
export type BooleanFieldComparison = z.infer<
	typeof BooleanFieldComparisonSchema
>
export type DateFieldComparison = z.infer<typeof DateFieldComparisonSchema>
export type OptionFieldComparison = z.infer<typeof OptionFieldComparisonSchema>
export type ReferenceFieldStringComparison = z.infer<
	typeof ReferenceFieldStringComparisonSchema
>
export type ReferenceFieldObjectComparison = z.infer<
	typeof ReferenceFieldObjectComparisonSchema
>
export type IsSetComparison = z.infer<typeof IsSetComparisonSchema>
