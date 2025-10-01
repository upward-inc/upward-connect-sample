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
		// Ensure it's a non-null json object
		return typeof data === "object" && data !== null && !Array.isArray(data)
	})
	.openapi({
		description: "作成するレコードのデータ",
		example: {
			name: "株式会社 XXX", // string
			account_number: "ACC-XXXXX",
			main_phone_number: "03-1234-5678",
			sub_phone_number: null,
			website: "https://www.example.com",
			industry: "agriculture", // single optional
			number_of_employees: 1000, // numeric
			revenue: 10000000,
			address_zipcode: "123-4567",
			address_prefecture: "東京都",
			address_municipality: "新宿区",
			address_street: "西新宿2丁目8-1",
			latitude: 35.6895,
			longitude: 139.6917,
			parent: "fe604faa-0731-4424-a22f-737d60047f39", // reference
		},
	})

export const PostRecordResponseSchema = z
	.object({
		entity_name: z.string().openapi({
			description: "作成されたレコードのエンティティ名",
			examples: ["account", "lead"],
		}),
		id: z.string().uuid().openapi({
			description: "作成されたレコードのID",
			example: "fe604faa-0731-4424-a22f-737d60047f39",
		}),
	})
	.openapi({
		description: "作成されたレコードデータ",
	})

export type Record = z.infer<typeof RecordSchema>
export type RecordList = z.infer<typeof RecordListSchema>
export type GetRecordListQuery = z.infer<typeof GetRecordListQuerySchema>
export type GetRecordListResponse = z.infer<typeof GetRecordListResponseSchema>
export type PostRecordBody = z.infer<typeof PostRecordBodySchema>
export type PostRecordResponse = z.infer<typeof PostRecordResponseSchema>
