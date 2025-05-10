import { z } from "zod"
import "zod-openapi/extend"

export const FileSchema = z.instanceof(Uint8Array<ArrayBuffer>).openapi({
	description: "ファイル",
})

export const FileRecordSchema = z
	.object({
		id: z.string(),
		name: z.string(),
		type: z.string(),
		content: FileSchema,
	})
	.openapi({
		description: "ファイルレコード",
	})

export const GetFileParamSchema = z.object({
	id: z.string().openapi({
		description: "ID",
		example: "00000001",
	}),
})

export const PostFileFormSchema = z.object({
	file: z.instanceof(File).openapi({
		description: "ファイル",
	}),
})

export const PostFileResultSchema = z.object({
	id: z.string().openapi({
		description: "ID",
		example: "00000001",
	}),
})

export type File = z.infer<typeof FileSchema>
export type FileRecord = z.infer<typeof FileRecordSchema>
