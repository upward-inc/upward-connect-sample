import { z } from "zod"
import "zod-openapi/extend"

export const ConfigurationSchema = z
	.object({
		entity_name: z.object({
			user: z.string().openapi({
				description: "システムユーザーが管理されているエンティティ名",
				examples: ["user", "system-user"],
			}),
			account: z.string().openapi({
				description: "取引先が管理されているエンティティ名",
				examples: ["account", "company"],
			}),
			lead: z.string().optional().openapi({
				description: "リードが管理されているエンティティ名",
				example: "lead",
			}),
			contact: z
				.string()
				.optional()
				.openapi({
					description: "取引先担当者が管理されているエンティティ名",
					examples: ["contact", "contact_person"],
				}),
			activity: z
				.string()
				.optional()
				.openapi({
					description: "活動の予定や実績が管理されているエンティティ名",
					examples: ["activity", "schedule", "event"],
				}),
			phone_call: z
				.string()
				.optional()
				.openapi({
					description: "通話履歴が管理されているエンティティ名",
					examples: ["phone_call", "call_history", "task"],
				}),
		}),
	})
	.openapi({
		description: "UPWARDとの連携のために必要な構成データ（静的情報）",
	})

export type Configuration = z.infer<typeof ConfigurationSchema>
