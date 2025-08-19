import { z } from "zod"
import "zod-openapi/extend"
import { StringToArraySchema } from "./utility"

export const OAuthClientSchema = z
	.object({
		id: z.string().openapi({
			description: "クライアントID",
		}),
		name: z.string().openapi({
			description: "クライアント名",
		}),
		secret: z.string().openapi({
			description: "クライアントシークレット",
		}),
		redirect_uris: StringToArraySchema().openapi({
			description: "リダイレクトURI",
		}),
		scopes: StringToArraySchema().openapi({
			description: "スコープ",
		}),
	})
	.openapi({
		description: "登録済みOAuthクライアント",
	})

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
		email: z.string().email().openapi({
			description: "メールアドレス",
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
	nonce: z.string().optional(),
})

// トークンリクエスト用のスキーマ
export const TokenRequestSchema = z.discriminatedUnion("grant_type", [
	z.object({
		grant_type: z.literal("authorization_code"),
		code: z.string().min(1),
		redirect_uri: z.string().url(),
		client_id: z.string().min(1),
		client_secret: z.string().min(1),
	}),
	z.object({
		grant_type: z.literal("refresh_token"),
		refresh_token: z.string().min(1),
		client_id: z.string().min(1),
		client_secret: z.string().min(1),
	}),
])

export type OAuthClient = z.infer<typeof OAuthClientSchema>
export type LoggedInUser = z.infer<typeof LoggedInUserSchema>
export type PostLoginParam = z.infer<typeof PostLoginParamSchema>
export type PostAuthorizeParam = z.infer<typeof PostAuthorizeParamSchema>
export type TokenRequest = z.infer<typeof TokenRequestSchema>

// 認証ルート用コンテキスト（認証済みユーザー情報）
export type AuthContexts = {
	user: Pick<LoggedInUser, "id">
}
