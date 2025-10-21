import { prisma } from "../../libs/prisma"
import { UuidSchema } from "../../schema/common"
import { getEntity } from "../entity"

export const getRecordExists = async (
	entity_name: string,
	id: string,
): Promise<boolean> => {
	// SQLインジェクション対策

	// エンティティの存在確認
	const entity = await getEntity(entity_name)
	if (!entity) {
		return false
	}

	// UUIDバリデーション
	const parseResult = UuidSchema.safeParse(id)
	if (!parseResult.success) {
		return false
	}

	try {
		const result = await prisma.$queryRawUnsafe<{ count: number }[]>(
			`SELECT COUNT(*) AS count FROM [${entity_name}] WHERE id = '${parseResult.data}'`,
		)
		return (result.at(0)?.count ?? 0) > 0
	} catch {
		return false
	}
}
