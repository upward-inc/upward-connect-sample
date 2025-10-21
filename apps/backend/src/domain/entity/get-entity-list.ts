import { prisma } from "../../libs/prisma"
import { type EntityList, EntityListSchema } from "../../schema/entity"

export const getEntityList = async (): Promise<EntityList> => {
	const result = await prisma.entity.findMany({
		orderBy: [{ order: "asc" }],
	})
	return EntityListSchema.parse(result)
}
