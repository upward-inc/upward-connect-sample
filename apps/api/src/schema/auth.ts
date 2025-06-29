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

// 認可コードリクエスト用のスキーマ
export const PostAuthorizeParamSchema = z.object({
	response_type: z.literal("code"),
	client_id: z.string().min(1),
	redirect_uri: z.string().url(),
	scope: z.string().optional(),
	state: z.string().optional(),
})

// トークンリクエスト用のスキーマ
export const TokenRequestSchema = z.object({
	grant_type: z.literal("authorization_code"),
	code: z.string().min(1),
	redirect_uri: z.string().url(),
	client_id: z.string().min(1),
})

export type LoggedInUser = z.infer<typeof LoggedInUserSchema>
export type PostLoginParam = z.infer<typeof PostLoginParamSchema>
export type PostAuthorizeParam = z.infer<typeof PostAuthorizeParamSchema>
export type TokenRequest = z.infer<typeof TokenRequestSchema>

// 認証ルート用コンテキスト（認証済みユーザー情報）
export type AuthContexts = {
	user: Pick<LoggedInUser, "id">
}
