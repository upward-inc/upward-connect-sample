import { prisma } from "../../libs/prisma"

export const deleteRecord = async (
	entityName: string,
	id: string,
): Promise<void> => {
	const query = `
		DELETE FROM [${entityName}]
		WHERE id = '${id}'
	`

	const result = await prisma.$executeRawUnsafe(query)

	if (result === 0) {
		throw new Error("レコードが見つかりません")
	}
}
