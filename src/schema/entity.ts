import { z } from "zod"
import "zod-openapi/extend"

export const EntitySchema = z
	.object({
		name: z.string().openapi({
			description: "名称",
			examples: ["account", "opportunity"],
		}),
		display_name: z.string().openapi({
			description: "表示名",
			examples: ["取引先", "商談"],
		}),
	})
	.openapi({
		description: "エンティティの説明",
	})

export const EntityListSchema = z.array(EntitySchema)

export const GetEntityParamSchema = z.object({
	name: z.string(),
})

export type Entity = z.infer<typeof EntitySchema>
export type EntityList = z.infer<typeof EntityListSchema>
