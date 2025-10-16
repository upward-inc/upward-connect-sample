import { z } from "zod"
import { ToDateSchema } from "./utility"

export const UserIdSchema = z.string().meta({
	description: "ユーザーID",
	example: "user-00000001",
})

export const UserNameSchema = z.string().meta({
	description: "ユーザー名",
	example: "yosuke-tahara@example.com",
})

export const FullNameSchema = z.string().meta({
	description: "フルネーム",
	example: "田原 陽介",
})

export const FirstNameSchema = z.string().meta({
	description: "名",
	example: "陽介",
})

export const LastNameSchema = z.string().meta({
	description: "姓",
	example: "田原",
})

export const EmailSchema = z.email().meta({
	description: "メールアドレス",
	example: "yosuke-tahara@example.com",
})

export const TimezoneSchema = z.string().meta({
	description: "タイムゾーン",
	example: "Asia/Tokyo",
})

export const LocaleSchema = z.string().meta({
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
		profile_name: z.string().meta({
			description: "プロファイル名",
			example: "admin",
		}),
		role_name: z.string().nullable().meta({
			description: "ロール名",
			example: "west_japan_sales_department",
		}),
		is_active: z.boolean().meta({
			description: "有効かどうか",
			example: true,
		}),
		created_at: ToDateSchema.meta({
			description: "作成日時",
			example: "2025-01-01T00:00:00Z",
		}),
		modified_at: ToDateSchema.meta({
			description: "更新日時",
			example: "2025-01-01T00:00:00Z",
		}),
	})
	.meta({
		description: "システムユーザー",
	})

export const SystemUserListSchema = z.array(SystemUserSchema).meta({
	description: "システムユーザー一覧",
})

export const GetSystemUserParamSchema = z.object({
	id: z.string(),
})

export type SystemUser = z.infer<typeof SystemUserSchema>
export type SystemUserList = z.infer<typeof SystemUserListSchema>
