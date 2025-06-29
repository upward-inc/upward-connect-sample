import { sign } from "jsonwebtoken"
import { env } from "../../env"

/**
 * ユーザー情報からアクセストークンとIDトークンを生成する
 */
export const generateToken = (user: {
	id: string
	userName: string
}) => {
	const accessToken = sign({}, env.OIDC_TOKEN_SECRET, {
		algorithm: "HS256",
		issuer: env.OIDC_ISSUER,
		subject: user.id,
		audience: env.OIDC_AUDIENCE,
		expiresIn: `${env.OIDC_TOKEN_EXPIRES_IN_MINUTE} minutes`,
	})

	const idToken = sign(
		{
			username: user.userName,
		},
		env.OIDC_TOKEN_SECRET,
		{
			algorithm: "HS256",
			issuer: env.OIDC_ISSUER,
			subject: user.id,
			audience: env.OIDC_AUDIENCE,
			expiresIn: `${env.OIDC_TOKEN_EXPIRES_IN_MINUTE} minutes`,
		},
	)

	return { accessToken, idToken }
}

/**
 * ユーザー情報からリフレッシュトークンを生成する
 */
export const generateRefreshToken = (user: {
	id: string
}) => {
	const refreshToken = sign({}, env.OIDC_REFRESH_TOKEN_SECRET, {
		algorithm: "HS256",
		issuer: env.OIDC_ISSUER,
		subject: user.id,
		audience: env.OIDC_AUDIENCE,
		expiresIn: `${env.OIDC_REFRESH_TOKEN_EXPIRES_IN_DAY} days`,
	})

	return { refreshToken }
}
