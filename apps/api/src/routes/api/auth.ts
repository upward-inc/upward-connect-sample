import { Hono } from "hono"
import { nanoid } from "nanoid"
import {
	deleteAuthorizationCode,
	generateRefreshToken,
	generateToken,
	getFirstOAuthClientByName,
	getOAuthClientById,
	getUserById,
	getUserByUsernameAndPassword,
	saveAuthorizationCode,
	validateAuthorizeParams,
	validateRefreshTokenParams,
	validateTokenParams,
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

		const client = await getFirstOAuthClientByName(env.OIDC_CLIENT_NAME)
		if (!client) {
			throw new Error("no default oauth2 client")
		}

		const { accessToken } = generateToken({
			userId: user.id,
			userName: user.user_name,
			clientId: client.id,
		})
		return c.json({ ...user, access_token: accessToken })
	})
	.get("/clients/:id", async (c) => {
		const clientId = c.req.param("id")

		const client = await getOAuthClientById(clientId)
		if (!client) {
			return c.json({ message: "Client not found" }, 404)
		}

		// 必要最低限のフィールドのみ返却
		return c.json({ id: client.id, name: client.name })
	})
	.post(
		"/authorize",
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
						state: params.state ?? null,
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
				scope: validateResult.scope ?? null,
				state: validateResult.state ?? null,
				nonce: validateResult.nonce ?? null,
				published_at: new Date(),
				expire_at: new Date(
					Date.now() + 1000 * 60 * env.OAUTH2_AUTH_CODE_EXPIRES_IN_MINUTE,
				),
			})

			return c.json({
				code: authorizationCode,
				state: validateResult.state ?? null,
			})
		},
	)
	.post("/token", validator("form", TokenRequestSchema), async (c) => {
		const params = c.req.valid("form")

		if (params.grant_type === "authorization_code") {
			// パラメータの検証
			const validateResult = await validateTokenParams(params)

			if (!validateResult.success) {
				return c.json(
					{
						error: "invalid_grant",
						error_description: validateResult.error_message,
					},
					400,
				)
			}
			const { user_id, user_name, client_id, nonce } = validateResult

			// 認可コードを使用済みにする（データベースから削除する）
			await deleteAuthorizationCode(params.code)

			// アクセストークン、IDトークンを生成
			const { accessToken, idToken } = generateToken({
				userId: user_id,
				userName: user_name,
				clientId: client_id,
				nonce: nonce,
			})

			// リフレッシュトークンを生成
			const { refreshToken } = generateRefreshToken({
				userId: user_id,
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
			const { accessToken } = generateToken({
				userId: user_id,
				userName: user_name,
				clientId: client_id,
			})

			// リフレッシュトークンを生成
			const { refreshToken } = generateRefreshToken({
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
	})
	.get("/userinfo", async (c) => {
		const user = c.get("user")

		const loggedInUser = await getUserById(user.id)

		if (!loggedInUser) {
			return c.json(
				{
					error: "User not found",
					error_description:
						"The user associated with the provided token does not exist.",
				},
				404,
			)
		}

		return c.json({
			sub: loggedInUser.id,
			name: loggedInUser.user_name,
			given_name: loggedInUser.first_name,
			family_name: loggedInUser.last_name,
			email: loggedInUser.email,
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
