import { z } from "zod"
import "zod-openapi/extend"

export const EntityItemOptionSchema = z
	.object({
		name: z.string().openapi({
			description: "オプション名",
			example: "finance",
		}),
		display_name: z.string().openapi({
			description: "オプションの表示名",
			example: "金融業",
		}),
		is_default: z.boolean().openapi({
			description: "レコード作成時のデフォルト値かどうか",
			example: true,
		}),
	})
	.openapi({
		description: "項目選択肢",
	})

export const EntityItemOptionListSchema = z.array(EntityItemOptionSchema)

export type EntityItemOption = z.infer<typeof EntityItemOptionSchema>
export type EntityItemOptionList = z.infer<typeof EntityItemOptionListSchema>
