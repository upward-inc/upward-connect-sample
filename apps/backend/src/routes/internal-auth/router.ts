import { addMinute } from "@formkit/tempo"
import type { Context } from "hono"
import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie"
import { nanoid } from "nanoid"
import { configuration } from "../../configuration"
import {
	getActiveUserByUsernameAndPassword,
	getOAuthClientById,
	saveAuthorizationCode,
	validateAuthorizeParams,
} from "../../domain/auth"
import { createRoute, honoApp } from "../../libs/hono"
import {
	GetOAuthClientParamSchema,
	GetOAuthClientResultSchema,
	type LoggedInUser,
	PostAuthorizeParamSchema,
	PostAuthorizeResultSchema,
	PostLoginParamSchema,
	PostLoginResultSchema,
	type Session,
	SessionSchema,
	StateSchema,
} from "../../schema/auth"
import {
	OAuthApiErrorResultSchema,
	ResourceApiErrorResultSchema,
} from "../../schema/error"

const SESSION_COOKIE_NAME = "session"

export const internalAuthRouter = honoApp()
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

			const session = await setCookie(c, user)
			return c.json({ ...user, expired_at: session.expiredAt }, 200)
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
				401: {
					description: "Unauthorized",
					content: {
						"application/json": { schema: ResourceApiErrorResultSchema },
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
			// セッションからユーザー情報を取得
			const userId = await validateSession(c)
			if (!userId) {
				return c.json({ message: "Session expired" }, 401)
			}

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

			// セッションからユーザー情報を取得
			const userId = await validateSession(c)
			if (!userId) {
				return c.json(
					{
						error: "login_required" as const,
						error_description: "Session expired",
						state: params.state,
					},
					400,
				)
			}

			// 認可コードを生成
			const authorizationCode = nanoid(128)

			await saveAuthorizationCode(authorizationCode, userId, {
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
	.openapi(
		createRoute({
			method: "post",
			path: "/logout",
			description: "セッションを破棄してログアウトする",
			responses: {
				204: {
					description: "No Content",
				},
			},
		}),
		async (c) => {
			deleteCookie(c, SESSION_COOKIE_NAME)
			return c.body(null, 204)
		},
	)

const setCookie = async (c: Context, user: LoggedInUser): Promise<Session> => {
	const expiredAt = addMinute(
		new Date(),
		configuration.APP_SESSION_EXPIRES_IN_MINUTE,
	)
	const session: Session = {
		userId: user.id,
		expiredAt: expiredAt.toISOString(),
	}
	await setSignedCookie(
		c,
		SESSION_COOKIE_NAME,
		JSON.stringify(session),
		configuration.APP_SESSION_SECRET,
		{
			path: "/auth",
			httpOnly: true,
			secure: true,
			sameSite: "Strict",
			expires: expiredAt,
		},
	)
	return session
}

const getCookie = async (c: Context): Promise<Session> => {
	const session = await getSignedCookie(
		c,
		configuration.APP_SESSION_SECRET,
		SESSION_COOKIE_NAME,
	)
	return session
		? SessionSchema.parse(session)
		: { userId: "", expiredAt: new Date(0).toISOString() }
}

/**
 * セッションの検証を行う
 * @param c
 * @returns userId または null
 */
const validateSession = async (c: Context): Promise<string | null> => {
	const { userId, expiredAt } = await getCookie(c)
	if (new Date(expiredAt) < new Date()) {
		return null
	}
	return userId
}
