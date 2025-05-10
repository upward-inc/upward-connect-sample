import { z } from "zod"
import "zod-openapi/extend"

export const EntityItemOptionSchema = z
	.object({
		name: z.string().openapi({
			description: "名称",
			example: "finance",
		}),
		display_name: z.string().openapi({
			description: "表示名",
			example: "金融業",
		}),
		is_default: z.boolean().openapi({
			description: "デフォルト値かどうか",
		}),
	})
	.openapi({
		description: "オプションの説明",
	})

export const EntityItemOptionListSchema = z.array(EntityItemOptionSchema)

export type EntityItemOption = z.infer<typeof EntityItemOptionSchema>
export type EntityItemOptionList = z.infer<typeof EntityItemOptionListSchema>
