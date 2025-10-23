import { env } from "../env"
import { z } from "../libs/zod"
import {
	EmailSchema,
	FirstNameSchema,
	FullNameSchema,
	LastNameSchema,
	LocaleSchema,
	TimezoneSchema,
	UserIdSchema,
	UserNameSchema,
} from "./system-user"
import { StringToArraySchema } from "./utility"

export const PrivateKeySchema = z
	.object({
		id: z.uuid().meta({
			description: "秘密鍵ID",
			example: "b1a2b3c4-d5e6-7f89-0a1b-2c3d4e5f6a7b",
		}),
		base64_iv: z.string(),
		encrypted_private_key_pem: z.string(),
	})
	.transform(async (obj) => {
		const encryptedBuffer = Buffer.from(obj.encrypted_private_key_pem, "base64")
		const key = await crypto.subtle.importKey(
			"raw",
			Buffer.from(env.OIDC_ENCRYPT_PRIVATE_KEY_SECRET),
			"AES-GCM",
			false,
			["decrypt"],
		)
		const decryptedBuffer = await crypto.subtle.decrypt(
			{
				name: "AES-GCM",
				iv: Buffer.from(obj.base64_iv, "base64"),
			},
			key,
			encryptedBuffer,
		)
		return {
			id: obj.id,
			private_key_pem: Buffer.from(decryptedBuffer).toString("utf-8"),
		}
	})

export const PrivateKeyListSchema = z.array(PrivateKeySchema).meta({
	description: "秘密鍵一覧",
})

export const ClientIdSchema = z.string().min(1).meta({
	description: "OAuth 2.0 クライアント識別子",
	example: "client-00000001",
})

export const ClientNameSchema = z.string().min(1).meta({
	description: "OAuth 2.0 クライアント名",
	example: "Sample Client",
})

export const ClientSecretSchema = z.string().min(1).meta({
	description: "OAuth 2.0 クライアントシークレット",
	example: "sample_client_secret",
})

export const AuthCodeSchema = z.string().min(1).meta({
	description: "認可コード",
	example: "sample_authorization_code",
})

export const RedirectUriSchema = z.url().meta({
	description: "リダイレクションURL（認可コード返却先URL）",
	example: "https://sample-app.upward.com/callback",
})

export const StateSchema = z.string().meta({
	description: "CSRF攻撃防止のために使用するランダムな文字列",
	example: "WVwJX4KDmLTs8piK",
})

export const NonceSchema = z.string().meta({
	description: "リプレイアタック対策のために使用する推測不可能な文字列",
	example: "cma33PzyycBFb3LA",
})

export const CodeChallengeSchema = z.string().min(43).max(128).meta({
	description: "認可コード横取り攻撃防止のために使用するハッシュ文字列",
	example: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
})

export const CodeChallengeMethodSchema = z.literal("S256").meta({
	description: "PKCEで使用するアルゴリズム",
	example: "S256",
})

export const AccessTokenSchema = z.string().min(1).meta({
	description: "アクセストークン",
	example: "sample_access_token",
})

export const IdTokenSchema = z.string().min(1).meta({
	description: "IDトークン",
	example: "sample_id_token",
})

export const RefreshTokenSchema = z.string().min(1).meta({
	description: "リフレッシュトークン",
	example: "sample_refresh_token",
})

const UrlUnionSchema = z.union([
	z.url().startsWith("https://"),
	z.url().startsWith("http://localhost:"),
])

export const IssuerSchema = UrlUnionSchema.meta({
	description: "発行者識別子",
	example: "https://auth.example.com",
})

export const SubjectSchema = z
	.string()
	.min(1)
	.meta({
		description: "subjectクレーム",
		examples: ["user-00000001", "https://example.com/users/user-00000001"],
	})

export const OAuthClientSchema = z
	.object({
		id: ClientIdSchema,
		name: ClientNameSchema,
		secret: ClientSecretSchema,
		redirect_uris: StringToArraySchema().meta({
			description: "リダイレクションURL（認可コード返却先URL）",
			example: ["https://sample-app.upward.com/callback"],
		}),
		scopes: StringToArraySchema().meta({
			description: "スコープ",
			example: ["openid", "profile", "email"],
		}),
	})
	.meta({
		description: "登録済みOAuthクライアント",
	})

export const PublishedAuthCodeSchema = z
	.object({
		auth_code: AuthCodeSchema,
		client_id: ClientIdSchema,
		client_secret: ClientSecretSchema,
		redirect_uri: RedirectUriSchema,
		scope: z.string().nullable().meta({
			description: "スコープ",
			example: "openid profile email",
		}),
		state: StateSchema.nullable(),
		nonce: NonceSchema.nullable(),
		code_challenge: CodeChallengeSchema.nullable(),
		code_challenge_method: CodeChallengeMethodSchema.nullable(),
		published_at: z.date().meta({
			description: "発行日時",
		}),
		expire_at: z.date().meta({
			description: "有効期限",
		}),
		user_id: UserIdSchema,
	})
	.meta({
		description: "発行済み認可コード情報",
	})

export const LoggedInUserSchema = z
	.object({
		id: UserIdSchema,
		user_name: UserNameSchema,
		first_name: FirstNameSchema,
		last_name: LastNameSchema,
		email: EmailSchema.nullable(),
		timezone: TimezoneSchema.nullable(),
		locale: LocaleSchema.nullable(),
	})
	.meta({
		description: "ログインに成功したユーザーの情報",
	})

// ログインリクエスト用のスキーマ
export const PostLoginParamSchema = z.object({
	username: z.string(),
	password: z.string(),
})

export const PostLoginResultSchema = LoggedInUserSchema.extend({
	access_token: AccessTokenSchema,
})

export const GetOAuthClientParamSchema = z.object({
	id: ClientIdSchema,
})

export const GetOAuthClientResultSchema = OAuthClientSchema.pick({
	id: true,
	name: true,
})

export const OidcConfigurationResultSchema = z
	.object({
		issuer: IssuerSchema,
		authorization_endpoint: UrlUnionSchema.meta({
			description: "認可処理エンドポイントのURL",
			example: "https://auth.example.com/oauth2/authorize",
		}),
		token_endpoint: UrlUnionSchema.meta({
			description: "トークン交換処理エンドポイントのURL",
			example: "https://auth.example.com/oauth2/token",
		}),
		userinfo_endpoint: UrlUnionSchema.meta({
			description: "ユーザー情報取得エンドポイントのURL",
			example: "https://auth.example.com/oauth2/userinfo",
		}),
		jwks_uri: UrlUnionSchema.meta({
			description: "公開鍵群が公開されているURL",
			example: "https://auth.example.com/oauth2/jwks",
		}),
		response_types_supported: z.array(z.enum(["code"])).meta({
			description: "サポートされているレスポンスタイプ一覧",
			example: ["code"],
		}),
		subject_types_supported: z.array(z.enum(["public"])).meta({
			description: "サポートされているサブジェクトタイプ一覧",
			example: ["public"],
		}),
		id_token_signing_alg_values_supported: z.array(z.enum(["RS256"])).meta({
			description: "サポートされているJWSサインアルゴリズム一覧",
			example: ["RS256"],
		}),
		scopes_supported: z
			.array(z.enum(["openid", "profile", "email", "offline_access"]))
			.meta({
				description: "サポートされているスコープ一覧",
				example: ["openid", "profile", "email", "offline_access"],
			}),
	})
	.meta({
		description: "OIDC 1.0 プロバイダーコンフィグレーション",
	})

/**
 * see: https://openid-foundation-japan.github.io/openid-connect-core-1_0.ja.html#StandardClaims
 */
export const GetUserInfoResultSchema = z.object({
	sub: SubjectSchema,
	user_id: UserIdSchema.meta({
		description: "システムユーザーID（非標準クレーム）",
	}),
	name: FullNameSchema.meta({
		description: "表示用のフルネーム",
	}),
	given_name: FirstNameSchema,
	family_name: LastNameSchema.optional(),
	email: EmailSchema.optional(),
	zoneinfo: TimezoneSchema,
	locale: LocaleSchema,
})

// 認可コードリクエスト用のスキーマ
export const PostAuthorizeParamSchema = z.object({
	response_type: z.literal("code"),
	client_id: ClientIdSchema,
	redirect_uri: RedirectUriSchema,
	scope: StringToArraySchema(" ").refine((arr) => arr.length > 0, {
		message: "At least one scope is required",
	}),
	state: StateSchema,
	nonce: NonceSchema,
	code_challenge: CodeChallengeSchema,
	code_challenge_method: CodeChallengeMethodSchema,
})

export const PostAuthorizeResultSchema = z.object({
	code: AuthCodeSchema,
	state: StateSchema,
})

// トークンリクエスト用のスキーマ
export const PostTokenParamSchema = z.discriminatedUnion("grant_type", [
	z.object({
		grant_type: z.literal("authorization_code"),
		code: AuthCodeSchema.meta({
			description: "認可処理でクライアントが取得した認可コード",
		}),
		redirect_uri: RedirectUriSchema,
		client_id: ClientIdSchema,
		client_secret: ClientSecretSchema,
		code_verifier: z.string().min(43).max(128).meta({
			description: "PKCEで使用するランダムな文字列",
			example: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
		}),
	}),
	z.object({
		grant_type: z.literal("refresh_token"),
		refresh_token: RefreshTokenSchema,
		client_id: ClientIdSchema,
		client_secret: ClientSecretSchema,
	}),
])

export const PostTokenResultSchema = z.object({
	token_type: z.literal("Bearer"),
	access_token: AccessTokenSchema,
	id_token: IdTokenSchema.optional(),
	refresh_token: RefreshTokenSchema.optional(),
	expires_in: z.number().min(1).meta({
		description: "有効期限（秒）",
		example: 600,
	}),
})

export type PrivateKey = z.infer<typeof PrivateKeySchema>
export type PrivateKeyList = z.infer<typeof PrivateKeyListSchema>
export type OAuthClient = z.infer<typeof OAuthClientSchema>
export type PublishedAuthCode = z.infer<typeof PublishedAuthCodeSchema>
export type LoggedInUser = z.infer<typeof LoggedInUserSchema>
export type PostLoginParam = z.infer<typeof PostLoginParamSchema>
export type PostLoginResult = z.infer<typeof PostLoginResultSchema>
export type GetOAuthClientParam = z.infer<typeof GetOAuthClientParamSchema>
export type GetOAuthClientResult = z.infer<typeof GetOAuthClientResultSchema>
export type OidcConfigurationResult = z.infer<
	typeof OidcConfigurationResultSchema
>
export type GetUserInfoResult = z.infer<typeof GetUserInfoResultSchema>
export type PostAuthorizeParam = z.infer<typeof PostAuthorizeParamSchema>
export type PostAuthorizeResult = z.infer<typeof PostAuthorizeResultSchema>
export type PostTokenParam = z.infer<typeof PostTokenParamSchema>
export type PostTokenResult = z.infer<typeof PostTokenResultSchema>

// 認証ルート用コンテキスト（認証済みユーザー情報）
export type AuthContexts = {
	user: Pick<LoggedInUser, "id">
}
