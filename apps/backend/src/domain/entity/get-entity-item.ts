import { prisma } from "../../libs/prisma"
import type { Entity } from "../../schema/entity"
import { type EntityItem, EntityItemSchema } from "../../schema/entity-item"

export const getEntityItem = async (
	entityName: Entity["name"],
	name: EntityItem["name"],
): Promise<EntityItem | null> => {
	const entity = await prisma.entity.findUnique({
		where: { name: entityName },
	})
	if (!entity) {
		return null
	}

	const result = await prisma.entity_item
		.findUnique({
			where: {
				entity_id_name: {
					entity_id: entity.id,
					name: name,
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
		})
		.then((result) => {
			return result
				? {
						...result,
						reference_entities: result.reference_entities
							? JSON.parse(result.reference_entities)
							: null,
						options: result.entity_item_option,
						default_value: getEntityItemDefaultValue(
							result,
							result.entity_item_option,
						),
					}
				: null
		})

	return result ? EntityItemSchema.parse(result) : null
}

export const getEntityItemDefaultValue = (
	entityItem: { type: string; sub_type: string | null },
	options: { name: string; is_default: boolean }[],
): string | string[] | null => {
	// 現在option型のみ対応
	if (entityItem.type !== "option") return null

	const defaultOptions = options.filter((item) => item.is_default)
	// sub_typeがmultiの場合は配列で返し、その他は単一の値で返す
	return entityItem.sub_type === "multi"
		? defaultOptions.map((item) => item.name)
		: (defaultOptions[0]?.name ?? null)
}
