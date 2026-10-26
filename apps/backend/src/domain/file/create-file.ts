import { prisma } from "../../libs/prisma"

export const createFile = async (
	file: File,
	userId: string,
	sourceRecord?: string,
): Promise<string> => {
	const blobData = await file.arrayBuffer()
	const buffer = Buffer.from(blobData)
	// API 仕様に合わせて `type/subtype` だけを保存する（Bun はテキスト系に `;charset=utf-8` を付与するため取り除く）
	const mimeType = file.type.split(";")[0].trim()

	const result = await prisma.file.create({
		data: {
			name: file.name,
			type: mimeType,
			content: buffer,
			source_record: sourceRecord ?? null,
			created_by: userId,
			modified_by: userId,
		},
	})

	return result.id
}
