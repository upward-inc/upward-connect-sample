import { isBefore } from "@formkit/tempo"
import { Hono } from "hono"
import { nanoid } from "nanoid"
import {
	deleteAuthorizationCode,
	generateRefreshToken,
	generateToken,
	getAuthorizationCode,
	getUserById,
	getUserByUsernameAndPassword,
	saveAuthorizationCode,
} from "../../domain/auth"
import { env } from "../../env"
import { validator } from "../../libs/hono-openapi"
import {
	type AuthContexts,
	PostAuthorizeParamSchema,
	PostLoginParamSchema,
	TokenRequestSchema,
} from "../../schema/auth"

export const authRouter = new Hono<{ Variables: AuthContexts }>()
	.post("/login", validator("form", PostLoginParamSchema), async (c) => {
		const { username, password } = c.req.valid("form")

		const user = await getUserByUsernameAndPassword(username, password)
		if (!user) {
			return c.json({ message: "Invalid username or password" }, 401)
		}

		const { accessToken } = generateToken({
			userId: user.id,
			userName: user.user_name,
		})
		return c.json({ ...user, access_token: accessToken })
	})
	.post(
		"/authorize",
		validator("form", PostAuthorizeParamSchema),
		async (c) => {
			const user = c.get("user")
			const { client_id, redirect_uri, scope, state } = c.req.valid("form")

			// TODO: client_idが登録されたものと完全一致していることの確認
			// TODO: redirect_uriがクライアントIDに対して登録されたものと完全一致していることの確認

			// 認証済みかどうかの確認（実際の実装ではセッション管理が必要）
			// この例では簡易的に認証済みとして扱います

			// 認可コードを生成
			const authorizationCode = nanoid(128)

			await saveAuthorizationCode(authorizationCode, user.id, {
				client_id,
				scope: scope ?? null,
				state: state ?? null,
				nonce: null, // TODO nonceの実装
				published_at: new Date(),
				expire_at: new Date(
					Date.now() + 1000 * 60 * env.OAUTH2_AUTH_CODE_EXPIRES_IN_MINUTE,
				),
			})

			return c.json({
				code: authorizationCode,
			})
		},
	)
	.post("/token", validator("form", TokenRequestSchema), async (c) => {
		const { grant_type, code, redirect_uri, client_id, client_secret } =
			c.req.valid("form")

		const getInvalidGrantError = (description: string) => {
			return c.json(
				{ error: "invalid_grant", error_description: description },
				400,
			)
		}

		if (grant_type === "authorization_code") {
			// 発行済み認可コードの存在確認
			const publishedAuthCode = await getAuthorizationCode(code)
			if (!publishedAuthCode) {
				return getInvalidGrantError("invalid authorization code")
			}

			// 有効期限の検証
			if (isBefore(publishedAuthCode.expire_at, new Date())) {
				return getInvalidGrantError("expired authorization code")
			}

			// クライアントIDの検証
			if (publishedAuthCode.client_id !== client_id) {
				return getInvalidGrantError("invalid client_id")
			}

			// クライアントシークレットの検証
			// TODO: クライアント管理用テーブルを作成し`client_secret`を保持する
			// if (publishedAuthCode.client_secret !== client_secret) {
			// 	return getInvalidGrantError("invalid client_secret")
			// }

			// リダイレクトURIの検証
			// TODO: `published_auth_code`テーブルに`redirect_uri`を保持する
			// if (
			// 	publishedAuthCode.redirect_uri !== redirect_uri
			// ) {
			// 	return getInvalidGrantError("invalid redirect_uri")
			// }

			// 認可コードを使用済みにする（データベースから削除する）
			await deleteAuthorizationCode(publishedAuthCode.auth_code)

			// ユーザーの取得
			const user = await getUserById(publishedAuthCode.user_id)
			if (!user) {
				return c.json({ message: "Unknown user" }, 500)
			}

			// アクセストークン、IDトークンを生成
			const { accessToken, idToken } = generateToken({
				userId: user.id,
				userName: user.user_name,
			})

			// リフレッシュトークンを生成
			const { refreshToken } = generateRefreshToken({
				userId: user.id,
			})

			return c.json({
				token_type: "Bearer",
				access_token: accessToken,
				id_token: idToken,
				refresh_token: refreshToken,
				expires_in: env.OIDC_TOKEN_EXPIRES_IN_MINUTE * 60,
			})
		}
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
