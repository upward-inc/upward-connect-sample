import { isBefore } from "@formkit/tempo"
import type { LoggedInUser, PublishedAuthCode } from "../../schema/auth"

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
	client_id: string
	scopes: string[]
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
export const validateTokenParams = (
	params: TokenParams,
	publishedAuthCode: PublishedAuthCode,
): ValidateResult => {
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

	// スコープの存在確認
	if (!publishedAuthCode.scope) {
		return { success: false, error_message: "No scope" }
	}

	return {
		success: true,
		client_id: publishedAuthCode.client_id,
		scopes: publishedAuthCode.scope.split(" "),
		nonce: publishedAuthCode.nonce ?? undefined,
	}
}
