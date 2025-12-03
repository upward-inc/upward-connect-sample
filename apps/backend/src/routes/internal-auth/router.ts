import { nanoid } from "nanoid"
import { configuration } from "../../configuration"
import {
	generateAccessToken,
	getActiveUserByUsernameAndPassword,
	getOAuthClientById,
	saveAuthorizationCode,
	validateAuthorizeParams,
} from "../../domain/auth"
import { createRoute, honoApp } from "../../libs/hono"
import {
	type AuthContexts,
	GetOAuthClientParamSchema,
	GetOAuthClientResultSchema,
	PostAuthorizeParamSchema,
	PostAuthorizeResultSchema,
	PostLoginParamSchema,
	PostLoginResultSchema,
	StateSchema,
} from "../../schema/auth"
import {
	OAuthApiErrorResultSchema,
	ResourceApiErrorResultSchema,
} from "../../schema/error"

export const internalAuthRouter = honoApp<{ Variables: AuthContexts }>()
	.openapi(
		createRoute({
			method: "post",
			path: "/login",
			description:
				"ユーザー名 + パスワードでユーザー認証を行う（アクセストークンを返却する）",
			request: {
				body: {
					content: {
						"application/x-www-form-urlencoded": {
							schema: PostLoginParamSchema,
						},
					},
				},
			},
			responses: {
				200: {
					description: "Success",
					content: {
						"application/json": { schema: PostLoginResultSchema },
					},
				},
				401: {
					description: "Unauthorized",
					content: {
						"application/json": { schema: ResourceApiErrorResultSchema },
					},
				},
			},
		}),
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
			return c.json({ ...user, access_token: accessToken }, 200)
		},
	)
	.openapi(
		createRoute({
			method: "get",
			path: "/clients/{id}",
			description: "OAuth 2.0 クライアントアプリケーション名を返却する",
			request: {
				params: GetOAuthClientParamSchema,
			},
			responses: {
				200: {
					description: "Success",
					content: {
						"application/json": { schema: GetOAuthClientResultSchema },
					},
				},
				404: {
					description: "Not Found",
					content: {
						"application/json": { schema: ResourceApiErrorResultSchema },
					},
				},
			},
		}),
		async (c) => {
			const clientId = c.req.param("id")

			const client = await getOAuthClientById(clientId)
			if (!client) {
				return c.json({ message: "Client not found" }, 404)
			}

			// 必要最低限のフィールドのみ返却
			return c.json({ id: client.id, name: client.name }, 200)
		},
	)
	.openapi(
		createRoute({
			method: "post",
			path: "/authorize",
			description:
				"OIDC 1.0 で定められた認可処理を行う（認可コードを返却する）",
			request: {
				body: {
					content: {
						"application/x-www-form-urlencoded": {
							schema: PostAuthorizeParamSchema,
						},
					},
				},
			},
			responses: {
				200: {
					description: "Success",
					content: {
						"application/json": { schema: PostAuthorizeResultSchema },
					},
				},
				400: {
					description: "Bad Request",
					content: {
						"application/json": {
							schema: OAuthApiErrorResultSchema.extend({
								state: StateSchema,
							}),
						},
					},
				},
			},
		}),
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
				state: params.state,
				nonce: validateResult.nonce,
				code_challenge: params.code_challenge,
				code_challenge_method: params.code_challenge_method,
				published_at: new Date(),
				expire_at: new Date(
					Date.now() +
						1000 * 60 * configuration.OAUTH2_AUTH_CODE_EXPIRES_IN_MINUTE,
				),
			})

			return c.json(
				{
					code: authorizationCode,
					state: params.state,
				},
				200,
			)
		},
	)
