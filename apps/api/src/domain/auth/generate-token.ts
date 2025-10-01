import { sign } from "jsonwebtoken"
import { env } from "../../env"

/**
 * ユーザー情報からアクセストークンとIDトークンを生成する
 */
export const generateToken = (payload: {
	userId: string
	userName: string
	clientId?: string
	nonce?: string
}) => {
	const accessToken = sign({}, env.OIDC_TOKEN_SECRET, {
		algorithm: "HS256",
		issuer: env.OIDC_ISSUER,
		subject: payload.userId,
		audience: payload.clientId,
		expiresIn: `${env.OIDC_TOKEN_EXPIRES_IN_MINUTE} minutes`,
	})

	const idToken = sign(
		{
			username: payload.userName,
			nonce: payload.nonce,
		},
		env.OIDC_TOKEN_SECRET,
		{
			algorithm: "HS256",
			issuer: env.OIDC_ISSUER,
			subject: payload.userId,
			audience: payload.clientId,
			expiresIn: `${env.OIDC_TOKEN_EXPIRES_IN_MINUTE} minutes`,
		},
	)

	return { accessToken, idToken }
}

/**
 * ユーザー情報からリフレッシュトークンを生成する
 */
export const generateRefreshToken = (payload: {
	userId: string
	clientId?: string
}) => {
	const refreshToken = sign({}, env.OIDC_REFRESH_TOKEN_SECRET, {
		algorithm: "HS256",
		issuer: env.OIDC_ISSUER,
		subject: payload.userId,
		audience: payload.clientId,
		expiresIn: `${env.OIDC_REFRESH_TOKEN_EXPIRES_IN_DAY} days`,
	})

	return { refreshToken }
}
