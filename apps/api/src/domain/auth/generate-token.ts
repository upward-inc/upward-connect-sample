import { sign } from "jsonwebtoken"
import { env } from "../../env"
import type { LoggedInUser } from "../../schema/auth"

/**
 * ユーザー情報からアクセストークンを生成する
 */
export const generateAccessToken = (payload: {
	userId: string
	userName: string
	clientId: string
	nonce?: string
}) => {
	const accessToken = sign({}, env.OIDC_TOKEN_SECRET, {
		algorithm: "HS256",
		issuer: env.OIDC_ISSUER,
		subject: payload.userId,
		audience: payload.clientId,
		expiresIn: `${env.OIDC_TOKEN_EXPIRES_IN_MINUTE} minutes`,
	})

	return accessToken
}

/**
 * ユーザー情報からIDトークンを生成する
 * @see: [Requesting Claims using Scope Values](https://openid.net/specs/openid-connect-core-1_0.html#ScopeClaims)
 */
export const generateIdToken = (payload: {
	user: LoggedInUser
	clientId: string
	scopes: string[]
	nonce?: string
}) => {
	const profileClaims = payload.scopes.includes("profile")
		? {
				name: `${payload.user.last_name} ${payload.user.first_name}`,
				family_name: payload.user.last_name,
				given_name: payload.user.first_name,
				zoneinfo: payload.user.timezone ?? undefined,
				locale: payload.user.locale ?? undefined,
			}
		: undefined
	const emailClaims = payload.scopes.includes("email")
		? {
				email: payload.user.email ?? undefined,
			}
		: undefined
	const idToken = sign(
		{
			nonce: payload.nonce,
			user_id: payload.user.id, // 非標準クレーム
			...profileClaims,
			...emailClaims,
		},
		env.OIDC_TOKEN_SECRET,
		{
			algorithm: "HS256",
			issuer: env.OIDC_ISSUER,
			subject: payload.user.id,
			audience: payload.clientId,
			expiresIn: `${env.OIDC_TOKEN_EXPIRES_IN_MINUTE} minutes`,
		},
	)
	return idToken
}

/**
 * ユーザー情報からリフレッシュトークンを生成する
 */
export const generateRefreshToken = (payload: {
	userId: string
	clientId: string
}) => {
	const refreshToken = sign({}, env.OIDC_REFRESH_TOKEN_SECRET, {
		algorithm: "HS256",
		issuer: env.OIDC_ISSUER,
		subject: payload.userId,
		audience: payload.clientId,
		expiresIn: `${env.OIDC_REFRESH_TOKEN_EXPIRES_IN_DAY} days`,
	})

	return refreshToken
}
