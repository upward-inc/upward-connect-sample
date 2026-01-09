import { prisma } from "../../libs/prisma"

export const createFile = async (
	file: File,
	userId: string,
): Promise<string> => {
	const blobData = await file.arrayBuffer()
	const buffer = Buffer.from(blobData)

	const result = await prisma.file.create({
		data: {
			name: file.name,
			type: file.type,
			content: buffer,
			created_by: userId,
			modified_by: userId,
		},
	})

	return result.id
}
