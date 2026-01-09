import { prisma } from "../../libs/prisma"
import { type EntityList, EntityListSchema } from "../../schema/entity"

export const getEntityList = async (): Promise<EntityList> => {
	const result = await prisma.entity
		.findMany({
			orderBy: [{ order: "asc" }],
		})
		.then((results) => {
			return results.map((result) => ({
				...result,
				id_field_name: "id",
			}))
		})
	return EntityListSchema.parse(result)
}
