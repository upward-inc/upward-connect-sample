import { z } from "../libs/zod"

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

export const PostFileFormSchema = z.object({
	file: z.file().meta({
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
