import { z } from "zod"
import "zod-openapi/extend"
import { StringToArraySchema } from "./utility"

export const OAuthClientSchema = z
	.object({
		id: z.string().openapi({
			description: "クライアントID",
			example: "00000001",
		}),
		name: z.string().openapi({
			description: "クライアント名",
			example: "Sample Client",
		}),
		secret: z.string().openapi({
			description: "クライアントシークレット",
			example: "sample_client_secret",
		}),
		redirect_uris: StringToArraySchema().openapi({
			description: "リダイレクトURI",
			example: ["https://example.com/callback"],
		}),
		scopes: StringToArraySchema().openapi({
			description: "スコープ",
			example: ["openid", "profile", "email"],
		}),
	})
	.openapi({
		description: "登録済みOAuthクライアント",
	})

export const LoggedInUserSchema = z
	.object({
		id: z.string().openapi({
			description: "ユーザーID",
			example: "00000001",
		}),
		user_name: z.string().openapi({
			description: "ユーザー名",
			example: "dsmail0@example.com",
		}),
		first_name: z.string().openapi({
			description: "名",
			example: "Dorey",
		}),
		last_name: z.string().openapi({
			description: "姓",
			example: "Smail",
		}),
		email: z.string().email().openapi({
			description: "メールアドレス",
			example: "dsmail0@example.com",
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

export const PostLoginResultSchema = LoggedInUserSchema.extend({
	access_token: z.string().openapi({
		description: "アクセストークン",
		example: "sample_access_token",
	}),
})

export const GetOAuthClientResultSchema = OAuthClientSchema.pick({
	id: true,
	name: true,
})

/**
 * see: https://openid-foundation-japan.github.io/openid-connect-core-1_0.ja.html#StandardClaims
 */
export const GetUserInfoResultSchema = z.object({
	sub: z.string().openapi({
		description: "subjectクレーム（ユーザー識別子）",
		example: "00000001",
	}),
	unique_name: z.string().openapi({
		description: "ユニーク名",
		example: "dsmail0@example.com",
	}),
	name: z.string().openapi({
		description: "表示用のフルネーム",
		example: "Dorey Smail",
	}),
	given_name: z.string().openapi({
		description: "名",
		example: "Dorey",
	}),
	family_name: z.string().openapi({
		description: "姓",
		example: "Smail",
	}),
	email: z.string().email().openapi({
		description: "メールアドレス",
		example: "dsmail0@example.com",
	}),
})

// 認可コードリクエスト用のスキーマ
export const PostAuthorizeParamSchema = z.object({
	response_type: z.literal("code"),
	client_id: z.string().min(1),
	redirect_uri: z.string().url(),
	scope: z.string().optional(),
	state: z.string().optional(),
})

export const PostAuthorizeResultSchema = z.object({
	code: z.string().openapi({
		description: "認可コード",
		example: "sample_code",
	}),
})

// トークンリクエスト用のスキーマ
export const PostTokenParamSchema = z.discriminatedUnion("grant_type", [
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

export const PostTokenResultSchema = z.object({
	token_type: z.literal("Bearer"),
	access_token: z.string().min(1).openapi({
		description: "アクセストークン",
		example: "sample_access_token",
	}),
	id_token: z.string().min(1).openapi({
		description: "IDトークン",
		example: "sample_id_token",
	}),
	refresh_token: z.string().min(1).openapi({
		description: "リフレッシュトークン",
		example: "sample_refresh_token",
	}),
	expires_in: z.number().min(1).openapi({
		description: "有効期限（秒）",
		example: 600,
	}),
})

export type OAuthClient = z.infer<typeof OAuthClientSchema>
export type LoggedInUser = z.infer<typeof LoggedInUserSchema>
export type PostLoginParam = z.infer<typeof PostLoginParamSchema>
export type PostLoginResult = z.infer<typeof PostLoginResultSchema>
export type GetOAuthClientResult = z.infer<typeof GetOAuthClientResultSchema>
export type GetUserInfoResult = z.infer<typeof GetUserInfoResultSchema>
export type PostAuthorizeParam = z.infer<typeof PostAuthorizeParamSchema>
export type PostAuthorizeResult = z.infer<typeof PostAuthorizeResultSchema>
export type PostTokenParam = z.infer<typeof PostTokenParamSchema>
export type PostTokenResult = z.infer<typeof PostTokenResultSchema>

// 認証ルート用コンテキスト（認証済みユーザー情報）
export type AuthContexts = {
	user: Pick<LoggedInUser, "id">
}
