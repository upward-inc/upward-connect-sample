import { z } from "zod"
import "zod-openapi/extend"

export const EntitySchema = z
	.object({
		name: z.string().openapi({
			description: "エンティティ名",
			examples: ["account", "opportunity"],
		}),
		display_name: z.string().openapi({
			description: "エンティティの表示名",
			examples: ["取引先", "商談"],
		}),
		title_field_name: z.string().openapi({
			description: "エンティティのタイトルとなる項目名",
			examples: ["name"],
		}),
	})
	.openapi({
		description: "エンティティ",
	})

export const EntityListSchema = z.array(EntitySchema).openapi({
	description: "エンティティ一覧",
})

export const GetEntityParamSchema = z.object({
	name: z.string(),
})

export type Entity = z.infer<typeof EntitySchema>
export type EntityList = z.infer<typeof EntityListSchema>
