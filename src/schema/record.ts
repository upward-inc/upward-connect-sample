import { z } from "zod"
import "zod-openapi/extend"
import { NestableFilterQuerySchema } from "./filter"
import {
	LimitQuerySchema,
	OffsetQuerySchema,
	OrderByQuerySchema,
} from "./paging"
import { StringToArraySchema } from "./utility"

export const RecordSchema = z.object({}).openapi({
	description: "レコードの説明",
})

export const RecordListSchema = z.array(RecordSchema)

const FieldsQuerySchema = StringToArraySchema().openapi({
	description:
		"結果に含めるフィールド名（カンマ区切り）、未指定の場合は全フィールドを返却",
	example: "id,name",
})

const GroupByQuerySchema = StringToArraySchema().openapi({
	description: "グループ化するフィールド名（カンマ区切り）",
	example: "category",
})

export const GetRecordListQuerySchema = z.object({
	// TODO: パラメータで受け取るべきか、URLディレクトリで表現すべきかを検討する
	entity_name: z.string().openapi({
		description: "検索対象のエンティティ名",
		examples: ["account", "lead"],
	}),
	// TODO: 参照先オブジェクトのフィールドを取得可能な形式を検討する
	fields: FieldsQuerySchema.optional(),
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

export type Record = z.infer<typeof RecordSchema>
export type RecordList = z.infer<typeof RecordListSchema>
export type GetRecordListQuery = z.infer<typeof GetRecordListQuerySchema>
export type GetRecordListResponse = z.infer<typeof GetRecordListResponseSchema>
