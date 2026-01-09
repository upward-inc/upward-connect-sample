import { prisma } from "../../libs/prisma"
import { type Entity, EntitySchema } from "../../schema/entity"

export const getEntity = async (
	name: Entity["name"],
): Promise<Entity | null> => {
	const result = await prisma.entity
		.findUnique({
			where: { name },
		})
		.then((result) => {
			return result
				? {
						...result,
						// このサンプルにおいては、すべてのエンティティのIDフィールド名は`id`として統一する
						id_field_name: "id",
					}
				: null
		})

	return result ? EntitySchema.parse(result) : null
}
