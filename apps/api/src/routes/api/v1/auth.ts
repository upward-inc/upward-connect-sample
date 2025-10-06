import { Hono } from "hono"
import { nanoid } from "nanoid"
import {
	deleteAuthorizationCode,
	generateAccessToken,
	generateIdToken,
	generateRefreshToken,
	getActiveUserById,
	getActiveUserByUsernameAndPassword,
	getAuthorizationCode,
	getOAuthClientById,
	saveAuthorizationCode,
	validateAuthorizeParams,
	validateRefreshTokenParams,
	validateTokenParams,
} from "../../../domain/auth"
import { env } from "../../../env"
import { describeRoute, validator } from "../../../libs/hono-openapi"
import {
	type AuthContexts,
	GetOAuthClientResultSchema,
	GetUserInfoResultSchema,
	PostAuthorizeParamSchema,
	PostAuthorizeResultSchema,
	PostLoginParamSchema,
	PostLoginResultSchema,
	PostTokenParamSchema,
	PostTokenResultSchema,
} from "../../../schema/auth"

export const authRouter = new Hono<{ Variables: AuthContexts }>()
	.post(
		"/login",
		describeRoute({
			description:
				"ユーザー名 + パスワードでユーザー認証を行う（アクセストークンを返却する）",
			schema: PostLoginResultSchema,
		}),
		validator("form", PostLoginParamSchema),
		async (c) => {
			const { username, password } = c.req.valid("form")

			const user = await getActiveUserByUsernameAndPassword(username, password)
			if (!user) {
				return c.json({ message: "Invalid username or password" }, 401)
			}

			const accessToken = generateAccessToken({
				userId: user.id,
				userName: user.user_name,
				// アクセストークンにはaud項目を含める必要があるが、
				// パスワード認証時に発行するアクセストークンにおいては使用されることがないのでダミーの値を設定
				clientId: "00000000-0000-0000-0000-000000000000",
			})
			return c.json({ ...user, access_token: accessToken })
		},
	)
	.get(
		"/clients/:id",
		describeRoute({
			description: "OAuth 2.0 クライアントアプリケーション名を返却する",
			schema: GetOAuthClientResultSchema,
		}),
		async (c) => {
			const clientId = c.req.param("id")

			const client = await getOAuthClientById(clientId)
			if (!client) {
				return c.json({ message: "Client not found" }, 404)
			}

			// 必要最低限のフィールドのみ返却
			return c.json({ id: client.id, name: client.name })
		},
	)
	.post(
		"/authorize",
		describeRoute({
			description:
				"OIDC 1.0 で定められた認可処理を行う（認可コードを返却する）",
			schema: PostAuthorizeResultSchema,
		}),
		validator("form", PostAuthorizeParamSchema),
		async (c) => {
			const user = c.get("user")
			const params = c.req.valid("form")

			// パラメータの検証
			const validateResult = await validateAuthorizeParams(params)

			if (!validateResult.success) {
				return c.json(
					{
						error: validateResult.error,
						error_description: validateResult.error_description,
						state: params.state,
					},
					400,
				)
			}

			// 認可コードを生成
			const authorizationCode = nanoid(128)

			await saveAuthorizationCode(authorizationCode, user.id, {
				client_id: validateResult.client_id,
				client_secret: validateResult.client_secret,
				redirect_uri: validateResult.redirect_uri,
				scopes: validateResult.scopes,
				state: params.state ?? null,
				nonce: validateResult.nonce ?? null,
				published_at: new Date(),
				expire_at: new Date(
					Date.now() + 1000 * 60 * env.OAUTH2_AUTH_CODE_EXPIRES_IN_MINUTE,
				),
			})

			return c.json({
				code: authorizationCode,
				state: params.state,
			})
		},
	)
	.post(
		"/token",
		describeRoute({
			description:
				"OIDC 1.0 で定められた認可やトークン更新処理を行う（各種トークンを返却する）",
			schema: PostTokenResultSchema,
		}),
		validator("form", PostTokenParamSchema),
		async (c) => {
			const params = c.req.valid("form")

			if (params.grant_type === "authorization_code") {
				// 発行済み認可コードの存在確認
				const publishedAuthCode = await getAuthorizationCode(params.code)
				if (!publishedAuthCode) {
					return c.json(
						{
							error: "invalid_grant",
							error_description: "Invalid authorization code",
						},
						400,
					)
				}

				// 認可コードを使用済みにする（データベースから削除する）
				// タイミング攻撃対策のため、パラメータ検証より前に実行
				await deleteAuthorizationCode(publishedAuthCode.auth_code)

				// ユーザーの存在確認
				const user = await getActiveUserById(publishedAuthCode.user_id)
				if (!user) {
					return c.json(
						{
							error: "invalid_grant",
							error_description: "Unknown user",
						},
						400,
					)
				}

				// パラメータの検証
				const validateResult = await validateTokenParams(
					params,
					publishedAuthCode,
				)

				if (!validateResult.success) {
					return c.json(
						{
							error: "invalid_grant",
							error_description: validateResult.error_message,
						},
						400,
					)
				}
				const { client_id, scopes, nonce } = validateResult

				// アクセストークンを生成
				const accessToken = generateAccessToken({
					userId: user.id,
					userName: user.user_name,
					clientId: client_id,
					nonce: nonce,
				})

				// IDトークンを生成 (openidスコープが含まれている場合のみ)
				const idToken = scopes.includes("openid")
					? generateIdToken({
							user: user,
							clientId: client_id,
							scopes: scopes,
							nonce: nonce,
						})
					: undefined

				// リフレッシュトークンを生成
				const refreshToken = generateRefreshToken({
					userId: user.id,
					clientId: client_id,
				})

				return c.json({
					token_type: "Bearer",
					access_token: accessToken,
					id_token: idToken,
					refresh_token: refreshToken,
					expires_in: env.OIDC_TOKEN_EXPIRES_IN_MINUTE * 60,
				})
			}

			if (params.grant_type === "refresh_token") {
				// リフレッシュトークンパラメータの検証
				const validateResult = await validateRefreshTokenParams(params)

				if (!validateResult.success) {
					return c.json(
						{
							error: "invalid_grant",
							error_description: validateResult.error_message,
						},
						400,
					)
				}
				const { user_id, user_name, client_id } = validateResult

				// アクセストークンを生成
				const accessToken = generateAccessToken({
					userId: user_id,
					userName: user_name,
					clientId: client_id,
				})

				// リフレッシュトークンを生成
				const refreshToken = generateRefreshToken({
					userId: user_id,
					clientId: client_id,
				})

				// `Upon successful validation of the Refresh Token, the response body is the Token Response of Section 3.1.3.3 except that it might not contain an id_token.`
				// see: [Successful Refresh Response](https://openid.net/specs/openid-connect-core-1_0.html#RefreshTokenResponse)
				return c.json({
					token_type: "Bearer",
					access_token: accessToken,
					refresh_token: refreshToken,
					expires_in: env.OIDC_TOKEN_EXPIRES_IN_MINUTE * 60,
				})
			}
		},
	)
	.get(
		"/userinfo",
		describeRoute({
			description: "OIDC 1.0 で定められたユーザー情報（UserInfo）を返却する",
			schema: GetUserInfoResultSchema,
		}),
		async (c) => {
			const user = c.get("user")

			const loggedInUser = await getActiveUserById(user.id)

			if (!loggedInUser) {
				return c.json(
					{
						error: "invalid_token",
						error_description:
							"The user associated with the provided token does not exist.",
					},
					401,
				)
			}

			return c.json({
				sub: loggedInUser.id,
				user_id: loggedInUser.id, // custom claim
				name: `${loggedInUser.last_name} ${loggedInUser.first_name}`,
				given_name: loggedInUser.first_name,
				family_name: loggedInUser.last_name ?? undefined,
				email: loggedInUser.email ?? undefined,
				// 下記のフィールドは必須なので、ファールバック値を設定する
				zoneinfo: loggedInUser.timezone ?? "Asia/Tokyo",
				locale: loggedInUser.locale ?? "ja-JP",
			})
		},
	)
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
