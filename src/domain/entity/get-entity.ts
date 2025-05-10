import { prisma } from "../../libs/prisma"
import { type Entity, EntitySchema } from "../../schema/entity"

export const getEntity = async (
	name: Entity["name"],
): Promise<Entity | null> => {
	const result = await prisma.entity.findUnique({
		where: { name },
	})

	return result ? EntitySchema.parse(result) : null
}
