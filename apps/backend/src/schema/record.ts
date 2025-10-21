import { z } from "../libs/zod"
import { JsonObjectSchema } from "./common"
import { NestableFilterQuerySchema } from "./filter"
import {
	LimitQuerySchema,
	OffsetQuerySchema,
	OrderByQuerySchema,
} from "./paging"
import { StringToArraySchema } from "./utility"

// TODO: zod.lazy()はまだサポートしていないため、openapiの内容を上書きする
// @see https://github.com/honojs/middleware/issues/643#issuecomment-2265271987
export const RecordSchema = JsonObjectSchema.meta({
	type: "object",
	description: "レコード",
	properties: {},
})

export const RecordListSchema = z.array(RecordSchema).meta({
	description: "レコード一覧",
})

const FieldsQuerySchema = StringToArraySchema().meta({
	description: "結果に含めるフィールド名（カンマ区切り）",
	example: "id,name",
})

const GroupByQuerySchema = StringToArraySchema().meta({
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
	has_next_page: z.boolean().meta({
		description: "同一の検索条件にて次ページが存在するかどうか",
		example: false,
	}),
	total_size: z.number().meta({
		description: "同一の検索条件にて取得可能なデータの総数",
		example: 1234,
	}),
	data: RecordListSchema.meta({ description: "クエリの結果を表す配列" }),
})

export const GetRecordParamSchema = z.object({
	entity_name: z.string().meta({
		description: "レコード検索対象のエンティティ名",
		examples: ["account", "lead"],
	}),
})

export const PostRecordParamSchema = z.object({
	entity_name: z.string().meta({
		description: "レコード作成対象のエンティティ名",
		examples: ["account", "lead"],
	}),
})

export const PostRecordBodySchema = z
	.any()
	.refine((data) => {
		return JsonObjectSchema.safeParse(data).success
	})
	.meta({
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
		entity_name: z.string().meta({
			description: "作成されたレコードのエンティティ名",
			examples: ["account", "lead"],
		}),
		id: z.string().meta({
			description: "作成されたレコードのID",
			examples: ["account-00000001", "lead-00000001"],
		}),
	})
	.meta({
		description: "作成されたレコードデータ",
	})

export const PatchRecordParamSchema = z.object({
	entity_name: z.string().meta({
		description: "レコード更新対象のエンティティ名",
		examples: ["account", "lead"],
	}),
	id: z.string().meta({
		description: "更新対象のレコードID",
		examples: ["account-00000001", "lead-00000001"],
	}),
})

export const PatchRecordBodySchema = PostRecordBodySchema.meta({
	description: "更新するレコードのデータ",
})

export const PatchRecordResponseSchema = z
	.object({
		entity_name: z.string().meta({
			description: "更新されたレコードのエンティティ名",
			examples: ["account", "lead"],
		}),
		id: z.string().meta({
			description: "更新されたレコードのID",
			examples: ["account-00000001", "lead-00000001"],
		}),
	})
	.meta({
		description: "更新されたレコードデータ",
	})

export const DeleteRecordParamSchema = z.object({
	entity_name: z.string().meta({
		description: "削除対象レコードのエンティティ名",
		examples: ["account", "lead"],
	}),
	id: z.string().meta({
		description: "削除対象のレコードID",
		examples: ["account-00000001", "lead-00000001"],
	}),
})

export const RecordReferenceInputSchema = z
	.object({
		entity_name: z.string().meta({ description: "エンティティ名" }),
		id: z.string().meta({ description: "レコードID" }),
	})
	.meta({ description: "レコードへの参照（入力）" })

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
