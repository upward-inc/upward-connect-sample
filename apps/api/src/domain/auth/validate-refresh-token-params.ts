import { verify } from "jsonwebtoken"
import { env } from "../../env"
import { getOAuthClientById } from "./get-oauth-client"
import { getUserById } from "./get-user"

interface RefreshTokenParams {
	grant_type: string
	refresh_token: string
	client_id: string
	client_secret: string
}

type ValidateResult = ValidateResultSuccess | ValidateResultFailure

interface ValidateResultSuccess {
	success: true
	user_id: string
	user_name: string
}

interface ValidateResultFailure {
	success: false
	error_message: string
}

/**
 * `token`エンドポイントパラメータの検証を行う（リフレッシュトークン用）
 *
 * @see [RFC6749 OAuth 2.0 - 6. Refreshing an Access Token](https://www.rfc-editor.org/rfc/rfc6749.html#section-6)
 */
export const validateRefreshTokenParams = async (
	params: RefreshTokenParams,
): Promise<ValidateResult> => {
	// OAuthクライアントの存在確認
	const client = await getOAuthClientById(params.client_id)
	if (!client) {
		return { success: false, error_message: "Invalid client id" }
	}
	if (client.secret !== params.client_secret) {
		return { success: false, error_message: "Invalid client secret" }
	}

	// リフレッシュトークンの検証
	try {
		const decoded = verify(params.refresh_token, env.OIDC_REFRESH_TOKEN_SECRET)

		// トークンの構造を確認
		if (typeof decoded !== "object" || !decoded.sub) {
			return {
				success: false,
				error_message: "Invalid refresh token structure",
			}
		}

		const userId = decoded.sub as string

		// ユーザーの存在確認
		const user = await getUserById(userId)
		if (!user) {
			return { success: false, error_message: "Unknown user" }
		}

		return {
			success: true,
			user_id: user.id,
			user_name: user.user_name,
		}
	} catch (error) {
		return { success: false, error_message: "Invalid refresh token" }
	}
}
