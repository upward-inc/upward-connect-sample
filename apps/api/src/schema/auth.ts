import { z } from "zod"
import "zod-openapi/extend"

export const LoggedInUserSchema = z
	.object({
		id: z.string().openapi({
			description: "ユーザーID",
		}),
		user_name: z.string().openapi({
			description: "ユーザー名",
		}),
		first_name: z.string().openapi({
			description: "名",
		}),
		last_name: z.string().openapi({
			description: "姓",
		}),
	})
	.openapi({
		description: "ログインに成功したユーザーの情報",
	})

// ログインリクエスト用のスキーマ
export const PostLoginParamSchema = z.object({
	username: z.string(),
	password: z.string(),
})

export type LoggedInUser = z.infer<typeof LoggedInUserSchema>
