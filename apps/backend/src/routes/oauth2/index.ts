import { OpenAPIHono, createRoute } from "@hono/zod-openapi"
import {
	deleteAuthorizationCode,
	generateAccessToken,
	generateIdToken,
	generateRefreshToken,
	getActiveUserById,
	getAuthorizationCode,
	validateRefreshTokenParams,
	validateTokenParams,
} from "../../domain/auth"
import { extractPublicKeyAsJwkFromPrivateKey } from "../../domain/auth/export-public-key-from-private-key"
import { getNotClosedJwkPrivateKeyList } from "../../domain/auth/get-jwk-private-key-list"
import { env } from "../../env"
import {
	type AuthContexts,
	GetJwksResultSchema,
	GetUserInfoResultSchema,
	PostTokenParamSchema,
	PostTokenResultSchema,
} from "../../schema/auth"
import { OAuthApiErrorResultSchema } from "../../schema/error"

export const oauth2Router = new OpenAPIHono<{ Variables: AuthContexts }>()
	.openapi(
		createRoute({
			method: "post",
			path: "/token",
			description:
				"OIDC 1.0 で定められた認可やトークン更新処理を行う（各種トークンを返却する）",
			request: {
				body: {
					content: {
						"application/x-www-form-urlencoded": {
							schema: PostTokenParamSchema,
						},
					},
				},
			},
			responses: {
				200: {
					description: "Success",
					content: {
						"application/json": { schema: PostTokenResultSchema },
					},
				},
				400: {
					description: "Bad Request",
					content: {
						"application/json": { schema: OAuthApiErrorResultSchema },
					},
				},
			},
		}),
		async (c) => {
			const params = c.req.valid("form")

			if (params.grant_type === "authorization_code") {
				// 発行済み認可コードの存在確認
				const publishedAuthCode = await getAuthorizationCode(params.code)
				if (!publishedAuthCode) {
					return c.json(
						{
							error: "invalid_grant" as const,
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
							error: "invalid_grant" as const,
							error_description: "Unknown user",
						},
						400,
					)
				}

				// パラメータの検証
				const validateResult = validateTokenParams(params, publishedAuthCode)

				if (!validateResult.success) {
					return c.json(
						{
							error: "invalid_grant" as const,
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
					? await generateIdToken({
							user: user,
							clientId: client_id,
							scopes: scopes,
							nonce: nonce,
						})
					: undefined

				// リフレッシュトークンを生成 (offline_accessスコープが含まれている場合のみ)
				const refreshToken = scopes.includes("offline_access")
					? generateRefreshToken({
							userId: user.id,
							clientId: client_id,
						})
					: undefined

				return c.json(
					{
						token_type: "Bearer" as const,
						access_token: accessToken,
						id_token: idToken,
						refresh_token: refreshToken,
						expires_in: env.OIDC_TOKEN_EXPIRES_IN_MINUTE * 60,
					},
					200,
				)
			}

			if (params.grant_type === "refresh_token") {
				// リフレッシュトークンパラメータの検証
				const validateResult = await validateRefreshTokenParams(params)

				if (!validateResult.success) {
					return c.json(
						{
							error: "invalid_grant" as const,
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
				return c.json(
					{
						token_type: "Bearer" as const,
						access_token: accessToken,
						refresh_token: refreshToken,
						expires_in: env.OIDC_TOKEN_EXPIRES_IN_MINUTE * 60,
					},
					200,
				)
			}
			// grant_typeがサポート対象外の場合
			return c.json(
				{
					error: "unsupported_grant_type" as const,
					error_description: "The grant_type is not supported.",
				},
				400,
			)
		},
	)
	.openapi(
		createRoute({
			method: "get",
			path: "/userinfo",
			description: "OIDC 1.0 で定められたユーザー情報（UserInfo）を返却する",
			responses: {
				200: {
					description: "Success",
					content: {
						"application/json": { schema: GetUserInfoResultSchema },
					},
				},
				401: {
					description: "Unauthorized",
					content: {
						"application/json": { schema: OAuthApiErrorResultSchema },
					},
				},
			},
		}),
		async (c) => {
			const user = c.get("user")

			const loggedInUser = await getActiveUserById(user.id)

			if (!loggedInUser) {
				return c.json(
					{
						error: "invalid_token" as const,
						error_description:
							"The user associated with the provided token does not exist.",
					},
					401,
				)
			}

			return c.json(
				{
					sub: loggedInUser.id,
					user_id: loggedInUser.id, // custom claim
					name: `${loggedInUser.last_name} ${loggedInUser.first_name}`,
					given_name: loggedInUser.first_name,
					family_name: loggedInUser.last_name ?? undefined,
					email: loggedInUser.email ?? undefined,
					// 下記のフィールドは必須なので、ファールバック値を設定する
					zoneinfo: loggedInUser.timezone ?? "Asia/Tokyo",
					locale: loggedInUser.locale ?? "ja-JP",
				},
				200,
			)
		},
	)
	.openapi(
		createRoute({
			method: "get",
			path: "/jwks",
			description: "id_tokenの署名を検証するための公開鍵群（JWKs）を返却する",
			responses: {
				200: {
					description: "Success",
					content: {
						"application/json": { schema: GetJwksResultSchema },
					},
				},
			},
		}),
		async (c) => {
			const privateKeys = await getNotClosedJwkPrivateKeyList()
			const jwks = {
				keys: privateKeys.map((key) =>
					extractPublicKeyAsJwkFromPrivateKey(key),
				),
			}

			return c.json(jwks, 200)
		},
	)
