import { prisma } from "../../libs/prisma"
import { type FileRecord, FileRecordSchema } from "../../schema/file"

export const getFile = async (id: string): Promise<FileRecord | null> => {
	const result = await prisma.file.findUnique({
		where: { id },
	})

	return result ? FileRecordSchema.parse(result) : null
}
