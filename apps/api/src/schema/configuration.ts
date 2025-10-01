import { z } from "zod"
import "zod-openapi/extend"

export const ConfigurationSchema = z
	.object({
		entity_name: z.object({
			user: z.string().openapi({
				description: "ユーザーエンティティの名称",
				example: "user",
			}),
			account: z.string().openapi({
				description: "取引先エンティティの名称",
				example: "account",
			}),
			lead: z.string().openapi({
				description: "リードエンティティの名称",
				example: "lead",
			}),
			contact: z.string().openapi({
				description: "取引先責任者エンティティの名称",
				example: "contact",
			}),
			activity: z.string().openapi({
				description: "活動エンティティの名称",
				example: "activity",
			}),
			phone_call: z.string().openapi({
				description: "通話エンティティの名称",
				example: "phone_call",
			}),
		}),
	})
	.openapi({
		description: "UPWARDとの連携のために必要な構成データ（静的情報）",
	})

export type Configuration = z.infer<typeof ConfigurationSchema>
