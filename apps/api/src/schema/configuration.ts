import { z } from "zod"
import "zod-openapi/extend"

export const EntityNameMappingSchema = z
	.object({
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
			description: "取引先担当者エンティティの名称",
			example: "contact",
		}),
		activity: z.string().openapi({
			description: "活動エンティティの名称",
			example: "activity",
		}),
		phone_call: z.string().openapi({
			description: "電話エンティティの名称",
			example: "phone_call",
		}),
	})
	.openapi({
		description:
			"UPWARDの標準エンティティ名と顧客側のエンティティ名のマッピング",
	})

export const ConfigurationResponseSchema = z
	.object({
		entity_name: EntityNameMappingSchema,
	})
	.openapi({
		description: "構成データ",
	})

export type EntityNameMapping = z.infer<typeof EntityNameMappingSchema>
export type ConfigurationResponse = z.infer<typeof ConfigurationResponseSchema>