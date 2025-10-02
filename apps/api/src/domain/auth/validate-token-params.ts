import { isBefore } from "@formkit/tempo"
import type { PublishedAuthCode } from "../../schema/auth"
import { getUserById } from "./get-user"

interface TokenParams {
	grant_type: string
	code: string
	redirect_uri: string
	client_id: string
	client_secret: string
}

type ValidateResult = ValidateResultSuccess | ValidateResultFailure

interface ValidateResultSuccess {
	success: true
	user_id: string
	user_name: string
	client_id: string
	nonce?: string
}

interface ValidateResultFailure {
	success: false
	error_message: string
}

/**
 * `token`エンドポイントパラメータの検証を行う
 *
 * @see [RFC6749 OAuth 2.0 - 4.1.3. Access Token Request](https://www.rfc-editor.org/rfc/rfc6749.html#section-4.1.3)
 */
export const validateTokenParams = async (
	params: TokenParams,
	publishedAuthCode: PublishedAuthCode,
): Promise<ValidateResult> => {
	// 有効期限の検証
	if (isBefore(publishedAuthCode.expire_at, new Date())) {
		return { success: false, error_message: "expired authorization code" }
	}

	// クライアントIDの検証
	if (publishedAuthCode.client_id !== params.client_id) {
		return { success: false, error_message: "Invalid client_id" }
	}

	// クライアントシークレットの検証
	if (publishedAuthCode.client_secret !== params.client_secret) {
		return { success: false, error_message: "Invalid client_secret" }
	}

	// リダイレクトURIの検証
	if (publishedAuthCode.redirect_uri !== params.redirect_uri) {
		return { success: false, error_message: "Invalid redirect_uri" }
	}

	// ユーザーの存在確認
	const user = await getUserById(publishedAuthCode.user_id)
	if (!user) {
		return { success: false, error_message: "Unknown user" }
	}

	return {
		success: true,
		user_id: user.id,
		user_name: user.user_name,
		client_id: publishedAuthCode.client_id,
		nonce: publishedAuthCode.nonce ?? undefined,
	}
}
