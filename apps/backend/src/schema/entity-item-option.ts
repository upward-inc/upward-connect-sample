import { z } from "../libs/zod"

export const EntityItemOptionSchema = z
	.object({
		name: z.string().meta({
			description: "オプション名",
			example: "finance",
		}),
		display_name: z.string().meta({
			description: "オプションの表示名",
			example: "金融業",
		}),
	})
	.meta({
		description: "項目選択肢",
	})

export const EntityItemOptionListSchema = z.array(EntityItemOptionSchema)

export type EntityItemOption = z.infer<typeof EntityItemOptionSchema>
export type EntityItemOptionList = z.infer<typeof EntityItemOptionListSchema>
