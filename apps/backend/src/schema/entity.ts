import { z } from "../libs/zod"

export const EntitySchema = z
	.object({
		name: z.string().meta({
			description: "エンティティ名",
			examples: ["account", "opportunity"],
		}),
		display_name: z.string().meta({
			description: "エンティティの表示名",
			examples: ["取引先", "商談"],
		}),
		id_field_name: z.string().meta({
			description: "エンティティのレコードのID（一意識別子）となる項目名",
			example: "id",
		}),
		title_field_name: z.string().meta({
			description: "エンティティのタイトルとなる項目名",
			example: "name",
		}),
	})
	.meta({
		description: "エンティティ",
	})

export const EntityListSchema = z.array(EntitySchema).meta({
	description: "エンティティ一覧",
})

export const GetEntityParamSchema = z.object({
	name: z.string(),
})

export type Entity = z.infer<typeof EntitySchema>
export type EntityList = z.infer<typeof EntityListSchema>
