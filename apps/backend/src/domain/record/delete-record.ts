import { prisma } from "../../libs/prisma"

export const deleteRecord = async (
	entityName: string,
	id: string,
): Promise<{ deleted: boolean }> => {
	const query = `
		DELETE FROM [${entityName}]
		WHERE id = '${id}'
	`

	const result = await prisma.$executeRawUnsafe(query)

	return { deleted: result > 0 }
}
