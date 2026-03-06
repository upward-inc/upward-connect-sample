import { prisma } from "../../libs/prisma"
import type { Entity } from "../../schema/entity"
import {
	type EntityItemList,
	EntityItemListSchema,
} from "../../schema/entity-item"
import { getEntityItemDefaultValue } from "."

export const getEntityItemList = async (
	entityName: Entity["name"],
): Promise<EntityItemList> => {
	const result = await prisma.entity_item
		.findMany({
			where: {
				entity: {
					name: entityName,
				},
			},
			include: {
				entity_item_option: {
					select: {
						name: true,
						display_name: true,
						is_default: true,
					},
					orderBy: [{ order: "asc" }],
				},
			},
			orderBy: [{ order: "asc" }],
		})
		.then((result) => {
			return result.map((item) => {
				return {
					...item,
					reference_entities: item.reference_entities
						? JSON.parse(item.reference_entities)
						: null,
					options: item.entity_item_option,
					default_value: getEntityItemDefaultValue(
						item,
						item.entity_item_option,
					),
				}
			})
		})

	return EntityItemListSchema.parse(result)
}
