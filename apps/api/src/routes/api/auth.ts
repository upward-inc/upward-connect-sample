import { Hono } from "hono"
import { nanoid } from "nanoid"
import { z } from "zod"
import {
	generateRefreshToken,
	generateToken,
	verifyUser,
} from "../../domain/auth"
import { env } from "../../env"
import { validator } from "../../libs/hono-openapi"
import type { PostLoginParamSchema } from "../../schema/auth"

// 認証用のスキーマ定義
const PostAuthJsonSchema = z.object({
	username: z.string().min(1, { message: "ユーザー名は必須です" }),
	password: z.string().min(1, { message: "パスワードは必須です" }),
})

// 認可コードリクエスト用のスキーマ
const PostAuthorizeParamSchema = z.object({
	user_id: z.string().min(1),
	response_type: z.literal("code"),
	client_id: z.string().min(1),
	redirect_uri: z.string().url(),
	scope: z.string().optional(),
	state: z.string().optional(),
})

// トークンリクエスト用のスキーマ
const TokenRequestSchema = z.object({
	grant_type: z.literal("authorization_code"),
	code: z.string().min(1),
	redirect_uri: z.string().url(),
	client_id: z.string().min(1),
})

// 認可コードの一時保存用
// TODO: データベースに保存するようにする
const authorizationCodes = new Map<
	string,
	{
		clientId: string
		scope: string | null
		nonce: string | null
		redirectUri: string
		userId: string
		expiresAt: number
	}
>()

export const authRouter = new Hono()
	.post("/login", validator("form", PostLoginParamSchema), async (c) => {
		const { username, password } = c.req.valid("form")

		const result = await verifyUser(username, password).catch(() => null)
		if (!result) {
			return c.json({ message: "Invalid username or password" }, 401)
		}

		const { accessToken } = generateToken({
			id: result.id,
			userName: result.user_name,
		})
		return c.json({ ...result, access_token: accessToken })
	})
	.post(
		"/authorize",
		validator("form", PostAuthorizeParamSchema),
		async (c) => {
			const { redirect_uri, client_id, scope } = c.req.valid("form")

			// TODO: client_idが登録されたものと完全一致していることの確認
			// TODO: redirect_uriがクライアントIDに対して登録されたものと完全一致していることの確認

			// 認証済みかどうかの確認（実際の実装ではセッション管理が必要）
			// この例では簡易的に認証済みとして扱います
			const userId = "user123" // 実際の実装ではセッションから取得

			// 認可コードを生成
			const authorizationCode = nanoid(64)

			// 認可コードを保存
			authorizationCodes.set(authorizationCode, {
				clientId: client_id,
				scope: scope ?? null,
				nonce: null,
				redirectUri: redirect_uri,
				userId,
				expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
			})

			// 成功レスポンスを返す
			return c.json({
				code: authorizationCode,
			})
		},
	)
	.post("/token", validator("form", TokenRequestSchema), async (c) => {
		const { code, redirect_uri, client_id } = c.req.valid("form")

		// 認可コードの検証
		const codeData = authorizationCodes.get(code)
		if (!codeData) {
			c.status(400)
			return c.json({
				error: "invalid_grant",
				error_description: "認可コードが無効です",
			})
		}

		// 有効期限の確認
		if (codeData.expiresAt < Date.now()) {
			authorizationCodes.delete(code)
			c.status(400)
			return c.json({
				error: "invalid_grant",
				error_description: "認可コードの有効期限が切れています",
			})
		}

		// クライアントIDとリダイレクトURIの検証
		if (
			codeData.clientId !== client_id ||
			codeData.redirectUri !== redirect_uri
		) {
			c.status(400)
			return c.json({
				error: "invalid_grant",
				error_description: "クライアントIDまたはリダイレクトURIが一致しません",
			})
		}

		// 認可コードを使用済みにする
		authorizationCodes.delete(code)

		// アクセストークンを生成
		const accessToken = "" // TODO: アクセストークンを生成するロジックを使用

		// IDトークンを生成
		const idToken = "" // TODO: IDトークンを生成するロジックを使用

		// リフレッシュトークンを生成
		const refreshToken = nanoid(64)

		return c.json({
			token_type: "Bearer",
			access_token: accessToken,
			id_token: idToken,
			refresh_token: refreshToken,
			expires_in: env.OIDC_TOKEN_EXPIRES_IN_MINUTE * 60,
		})
	})
// .get("/.well-known/openid-configuration", async (c) => {
// 	// OpenID Connect Discoveryドキュメントを返す
// 	// https://openid.net/specs/openid-connect-discovery-1_0.html
// 	return c.json({
// 		issuer: env.OIDC_ISSUER,
// 		authorization_endpoint: `${env.OIDC_ISSUER}/auth/authorize`,
// 		token_endpoint: `${env.OIDC_ISSUER}/auth/token`,
// 		userinfo_endpoint: `${env.OIDC_ISSUER}/auth/userinfo`,
// 		jwks_uri: `${env.OIDC_ISSUER}/auth/.well-known/jwks.json`,
// 		response_types_supported: [
// 			"code",
// 			"token",
// 			"id_token",
// 			"code token",
// 			"code id_token",
// 			"token id_token",
// 			"code token id_token",
// 		],
// 		subject_types_supported: ["public"],
// 		id_token_signing_alg_values_supported: ["HS256", "RS256"],
// 		scopes_supported: ["openid", "profile", "email"],
// 		token_endpoint_auth_methods_supported: [
// 			"client_secret_basic",
// 			"client_secret_post",
// 		],
// 		claims_supported: ["sub", "iss", "name", "email", "picture"],
// 		grant_types_supported: [
// 			"authorization_code",
// 			"refresh_token",
// 			"password",
// 		],
// 		// その他の必要な設定...
// 	})
// })
// .get("/.well-known/jwks.json", async (c) => {
// 	// JWKS（JSON Web Key Set）を返す
// 	// 実際の実装ではRSA鍵ペアを使用し、公開鍵を返すべきです
// 	// この例ではシンプルな対称鍵を使用しているため、実際のJWKSは返しません
// 	return c.json({
// 		keys: [
// 			// 実際のアプリケーションでは、ここに公開鍵情報を含めます
// 			{
// 				kty: "oct",
// 				use: "sig",
// 				kid: "sample-key-id",
// 				alg: "HS256",
// 			},
// 		],
// 	})
// })
