import { z } from "../libs/zod"

export const ConfigurationSchema = z
	.object({
		entity_name: z.object({
			user: z.string().meta({
				description: "システムユーザーが管理されているエンティティ名",
				examples: ["user", "system-user"],
			}),
			account: z.string().meta({
				description: "取引先が管理されているエンティティ名",
				examples: ["account", "company"],
			}),
			lead: z.string().optional().meta({
				description: "リードが管理されているエンティティ名",
				example: "lead",
			}),
			contact: z
				.string()
				.optional()
				.meta({
					description: "取引先担当者が管理されているエンティティ名",
					examples: ["contact", "contact_person"],
				}),
			activity: z
				.string()
				.optional()
				.meta({
					description: "活動の予定や実績が管理されているエンティティ名",
					examples: ["activity", "schedule", "event"],
				}),
			phone_call: z
				.string()
				.optional()
				.meta({
					description: "通話履歴が管理されているエンティティ名",
					examples: ["phone_call", "call_history", "task"],
				}),
		}),
		location_entities: z.array(z.string()).meta({
			description: "ロケーション検索が可能なエンティティ",
			examples: [["account", "lead"]],
		}),
	})
	.meta({
		description: "UPWARDとの連携のために必要な構成データ（静的情報）",
	})

export type Configuration = z.infer<typeof ConfigurationSchema>
