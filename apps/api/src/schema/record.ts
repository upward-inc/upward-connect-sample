import { z } from "zod"
import "zod-openapi/extend"
import { JsonObjectSchema } from "./common"
import { NestableFilterQuerySchema } from "./filter"
import {
	LimitQuerySchema,
	OffsetQuerySchema,
	OrderByQuerySchema,
} from "./paging"
import { StringToArraySchema } from "./utility"

export const RecordSchema = z.object({}).openapi({
	description: "レコード",
})

export const RecordListSchema = z.array(RecordSchema).openapi({
	description: "レコード一覧",
})

const FieldsQuerySchema = StringToArraySchema().openapi({
	description: "結果に含めるフィールド名（カンマ区切り）",
	example: "id,name",
})

const GroupByQuerySchema = StringToArraySchema().openapi({
	description: "グループ化するフィールド名（カンマ区切り）",
	example: "category",
})

export const GetRecordListQuerySchema = z.object({
	// TODO: 参照先オブジェクトのフィールドを取得可能な形式を検討する
	fields: FieldsQuerySchema,
	filter: NestableFilterQuerySchema.optional(),
	group_by: GroupByQuerySchema.optional(),
	order_by: OrderByQuerySchema.optional(),
	limit: LimitQuerySchema.optional(),
	offset: OffsetQuerySchema.optional(),
})

export const GetRecordListResponseSchema = z.object({
	has_next_page: z.boolean().openapi({
		description: "同一の検索条件にて次ページが存在するかどうか",
		example: false,
	}),
	total_size: z.number().openapi({
		description: "同一の検索条件にて取得可能なデータの総数",
		example: 1234,
	}),
	data: RecordListSchema.openapi({ description: "クエリの結果を表す配列" }),
})

export const GetRecordParamSchema = z.object({
	entity_name: z.string().openapi({
		description: "レコード検索対象のエンティティ名",
		examples: ["account", "lead"],
	}),
})

export const PostRecordParamSchema = z.object({
	entity_name: z.string().openapi({
		description: "レコード作成対象のエンティティ名",
		examples: ["account", "lead"],
	}),
})

export const PostRecordBodySchema = z
	.any()
	.refine((data) => {
		return JsonObjectSchema.safeParse(data).success
	})
	.openapi({
		description: "作成するレコードのデータ",
		example: {
			text_field: "ABC",
			textarea_field: "ABC\nDEF",
			integer_field: 123,
			decimal_field: 123.45,
			boolean_field: true,
			date_field: "2025-01-01",
			datetime_field: "2025-01-01T12:34:56Z",
			time_field: "12:34:56",
			single_option_field: "option-a",
			multi_option_field: ["option-a", "option-b"],
			single_reference_field: { entity_name: "lead", id: "lead-00000001" },
			multi_reference_field: [
				{ entity_name: "lead", id: "lead-00000001" },
				{ entity_name: "lead", id: "lead-00000002" },
			],
		},
	})

export const PostRecordResponseSchema = z
	.object({
		entity_name: z.string().openapi({
			description: "作成されたレコードのエンティティ名",
			examples: ["account", "lead"],
		}),
		id: z.string().openapi({
			description: "作成されたレコードのID",
			examples: ["account-00000001", "lead-00000001"],
		}),
	})
	.openapi({
		description: "作成されたレコードデータ",
	})

export const PatchRecordBodySchema = z
	.any()
	.refine((data) => {
		return JsonObjectSchema.safeParse(data).success
	})
	.openapi({
		description: "更新するレコードのデータ",
		example: {
			text_field: "ABC",
			textarea_field: "ABC\nDEF",
			integer_field: 123,
			decimal_field: 123.45,
			boolean_field: true,
			date_field: "2025-01-01",
			datetime_field: "2025-01-01T12:34:56Z",
			time_field: "12:34:56",
			single_option_field: "option-a",
			multi_option_field: ["option-a", "option-b"],
			single_reference_field: { entity_name: "lead", id: "lead-00000001" },
			multi_reference_field: [
				{ entity_name: "lead", id: "lead-00000001" },
				{ entity_name: "lead", id: "lead-00000002" },
			],
		},
	})

export const PatchRecordParamSchema = z.object({
	entity_name: z.string().openapi({
		description: "レコード更新対象のエンティティ名",
		examples: ["account", "lead"],
	}),
	id: z.string().openapi({
		description: "更新対象のレコードID",
		examples: ["account-00000001", "lead-00000001"],
	}),
})

export const PatchRecordResponseSchema = z
	.object({
		entity_name: z.string().openapi({
			description: "更新されたレコードのエンティティ名",
			examples: ["account", "lead"],
		}),
		id: z.string().openapi({
			description: "更新されたレコードのID",
			examples: ["account-00000001", "lead-00000001"],
		}),
	})
	.openapi({
		description: "更新されたレコードデータ",
	})

export const DeleteRecordParamSchema = z.object({
	entity_name: z.string().openapi({
		description: "削除対象レコードのエンティティ名",
		examples: ["account", "lead"],
	}),
	id: z.string().openapi({
		description: "削除対象のレコードID",
		examples: ["account-00000001", "lead-00000001"],
	}),
})

export const RecordReferenceInputSchema = z
	.object({
		entity: z.string().openapi({ description: "エンティティ名" }),
		id: z.string().openapi({ description: "レコードID" }),
	})
	.openapi({ description: "レコードへの参照（入力）" })

export type Record = z.infer<typeof RecordSchema>
export type RecordList = z.infer<typeof RecordListSchema>
export type GetRecordListQuery = z.infer<typeof GetRecordListQuerySchema>
export type GetRecordListResponse = z.infer<typeof GetRecordListResponseSchema>
export type PostRecordBody = z.infer<typeof PostRecordBodySchema>
export type PostRecordResponse = z.infer<typeof PostRecordResponseSchema>
export type PatchRecordBody = z.infer<typeof PatchRecordBodySchema>
export type PatchRecordResponse = z.infer<typeof PatchRecordResponseSchema>
export type DeleteRecordParam = z.infer<typeof DeleteRecordParamSchema>
export type RecordReferenceInput = z.infer<typeof RecordReferenceInputSchema>
