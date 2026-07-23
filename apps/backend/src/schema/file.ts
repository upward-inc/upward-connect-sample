import { z } from "../libs/zod"
import { LimitQuerySchema, OffsetQuerySchema } from "./paging"

export const FileIdSchema = z.string().meta({
	description: "ファイルID",
	example: "file-00000001",
})

export const FileSchema = z.instanceof(Uint8Array<ArrayBuffer>).meta({
	description: "ファイル",
})

export const FileRecordSchema = z
	.object({
		id: z.string(),
		name: z.string(),
		type: z.string(),
		content: FileSchema,
	})
	.meta({
		description: "ファイルレコード",
	})

export const GetFileParamSchema = z.object({
	id: FileIdSchema,
})

export const GetFileListQuerySchema = z.object({
	record_entity: z.string().meta({
		description: "ファイル検索対象レコードのエンティティ名",
		example: "account",
	}),
	record_id: z.string().meta({
		description: "ファイル検索対象のレコードID（単一指定のみ）",
		example: "account-00000001",
	}),
	limit: LimitQuerySchema.optional(),
	offset: OffsetQuerySchema.optional(),
})

export const FileMetadataSchema = z
	.object({
		id: FileIdSchema,
		type: z.string().meta({
			description: "ファイルのMIMEタイプ",
			example: "image/jpeg",
		}),
	})
	.meta({
		description: "ファイルメタデータ",
	})

export const GetFileListResponseSchema = z.object({
	has_next_page: z.boolean().meta({
		description: "同一の検索条件にて次ページが存在するかどうか",
		example: false,
	}),
	total_size: z.number().meta({
		description: "同一の検索条件にて取得可能なデータの総数",
		example: 2,
	}),
	data: z.array(FileMetadataSchema).meta({
		description: "紐づくファイルのメタデータ一覧",
	}),
})

export const PostFileHeaderSchema = z.object({
	"X-Record-Entity": z.string().optional().meta({
		description: "このファイルの出所となったレコードのエンティティ名",
	}),
	"X-Record-Id": z
		.string()
		.optional()
		.meta({ description: "このファイルの出所となったレコードID" }),
})

export const PostFileFormSchema = z.object({
	// TODO: z.file() が使えるようになったらそちらに変更する
	// @see https://github.com/honojs/middleware/issues/1316#issuecomment-3094398624
	file: z.instanceof(File).meta({
		type: "string",
		format: "binary",
		contentEncoding: "binary",
		description: "ファイル",
	}),
})

export const PostFileResultSchema = z
	.object({
		id: FileIdSchema,
	})
	.meta({
		description: "ファイル保存結果",
	})

export type File = z.infer<typeof FileSchema>
export type FileRecord = z.infer<typeof FileRecordSchema>
export type GetFileListQuery = z.infer<typeof GetFileListQuerySchema>
export type GetFileListResponse = z.infer<typeof GetFileListResponseSchema>
