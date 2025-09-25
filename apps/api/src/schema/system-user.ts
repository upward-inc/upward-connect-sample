import { z } from "zod"
import "zod-openapi/extend"
import { ToDateSchema } from "./utility"

export const SystemUserSchema = z
	.object({
		id: z.string().openapi({
			description: "ID",
			example: "00000001",
		}),
		user_name: z.string().openapi({
			description: "ユーザー名（ログイン名）",
			example: "dorey smail",
		}),
		first_name: z.string().openapi({
			description: "名前",
			example: "Dorey",
		}),
		last_name: z.string().openapi({
			description: "姓",
			example: "Smail",
		}),
		email: z.string().openapi({
			description: "メールアドレス",
			example: "dsmail0@example.com",
		}),
		timezone: z.string().openapi({
			description: "タイムゾーン",
			example: "Asia/Tokyo",
		}),
		locale: z.string().openapi({
			description: "ロケール",
			example: "ja-JP",
		}),
		profile_name: z.string().openapi({
			description: "プロファイル名",
			example: "admin",
		}),
		role_name: z.string().nullable().openapi({
			description: "ロール名",
			example: "sales_department",
		}),
		is_active: z.boolean().openapi({
			description: "有効かどうか",
			example: true,
		}),
		created_at: ToDateSchema.openapi({
			description: "作成日時",
			example: "2025-01-01T00:00:00Z",
		}),
		modified_at: ToDateSchema.openapi({
			description: "更新日時",
			example: "2025-01-01T00:00:00Z",
		}),
	})
	.openapi({
		description: "システムユーザーの説明",
	})

export const SystemUserListSchema = z.array(SystemUserSchema)

export const GetSystemUserParamSchema = z.object({
	id: z.string(),
})

export type SystemUser = z.infer<typeof SystemUserSchema>
export type SystemUserList = z.infer<typeof SystemUserListSchema>
