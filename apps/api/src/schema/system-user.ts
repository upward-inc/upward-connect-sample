import { z } from "zod"
import "zod-openapi/extend"
import { ToDateSchema } from "./utility"

export const UserIdSchema = z.string().openapi({
	description: "ユーザーID",
	example: "user-00000001",
})

export const UserNameSchema = z.string().openapi({
	description: "ユーザー名",
	example: "yosuke-tahara@example.com",
})

export const FullNameSchema = z.string().openapi({
	description: "フルネーム",
	example: "田原 陽介",
})

export const FirstNameSchema = z.string().openapi({
	description: "名",
	example: "陽介",
})

export const LastNameSchema = z.string().openapi({
	description: "姓",
	example: "田原",
})

export const EmailSchema = z.string().email().openapi({
	description: "メールアドレス",
	example: "yosuke-tahara@example.com",
})

export const TimezoneSchema = z.string().openapi({
	description: "タイムゾーン",
	example: "Asia/Tokyo",
})

export const LocaleSchema = z.string().openapi({
	description: "ロケール",
	example: "ja-JP",
})

export const SystemUserSchema = z
	.object({
		id: UserIdSchema,
		user_name: UserNameSchema,
		first_name: FirstNameSchema,
		last_name: LastNameSchema,
		email: EmailSchema.nullable(),
		timezone: TimezoneSchema.nullable(),
		locale: LocaleSchema.nullable(),
		profile_name: z.string().openapi({
			description: "プロファイル名",
			example: "admin",
		}),
		role_name: z.string().nullable().openapi({
			description: "ロール名",
			example: "west_japan_sales_department",
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
		description: "システムユーザー",
	})

export const SystemUserListSchema = z.array(SystemUserSchema).openapi({
	description: "システムユーザー一覧",
})

export const GetSystemUserParamSchema = z.object({
	id: z.string(),
})

export type SystemUser = z.infer<typeof SystemUserSchema>
export type SystemUserList = z.infer<typeof SystemUserListSchema>
