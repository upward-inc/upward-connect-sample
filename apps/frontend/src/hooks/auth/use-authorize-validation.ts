import { useEffect, useState } from "react"
import type { z } from "zod"
import {
	AuthorizeParamsRedirectUriSchema,
	type AuthorizeResultFailure,
	ClientIdSchema,
	CodeChallengeMethodSchema,
	CodeChallengeSchema,
	NonceSchema,
	ResponseTypeSchema,
	ScopeSchema,
	type SearchParamsSchema,
	StateSchema,
} from "../../schema/auth"

/**
 * 認可パラメータのバリデーションフック
 *
 * @see [RFC6749 OAuth 2.0](https://www.rfc-editor.org/rfc/rfc6749.html)
 * @see [OpenID Connect Core 1.0 - 3.1. Authentication using the Authorization Code Flow](https://openid.net/specs/openid-connect-core-1_0.html#CodeFlowAuth)
 * @see [OpenID Connect Core 1.0 - 3.1. Authentication using the Authorization Code Flow (Japanese)](https://openid-foundation-japan.github.io/openid-connect-core-1_0.ja.html#CodeFlowAuth)
 */
export function useAuthorizeValidation(
	searchParams: z.output<typeof SearchParamsSchema>,
	redirectFail: (url: string, result: AuthorizeResultFailure) => void,
) {
	const [isValidating, setIsValidating] = useState(true)

	// パラメータの検証（サーバーサイドでの検証前の最低限の検証）
	useEffect(() => {
		// `redirect_uri`の検証
		const { success: redirectUriSuccess, data: redirectUri } =
			AuthorizeParamsRedirectUriSchema.safeParse(searchParams.redirect_uri)
		if (!redirectUriSuccess) {
			// `redirect_uri`に不備がある場合は、エラーをスロー
			// オープンリダイレクト攻撃を防止するため、リダイレクトを行ってはならない
			alert("redirect_uriが不正です")
			throw new Error("invalid redirect_uri")
		}

		// `state`の検証
		const { success: stateSuccess, data: state } = StateSchema.safeParse(
			searchParams.state,
		)
		if (!stateSuccess) {
			redirectFail(redirectUri, { error: "invalid_request", state })
			return
		}

		// `response_type`の検証
		const { success: responseTypeSuccess } = ResponseTypeSchema.safeParse(
			searchParams.response_type,
		)
		if (!responseTypeSuccess) {
			redirectFail(redirectUri, { error: "unsupported_response_type", state })
			return
		}

		// `client_id`の検証
		const { success: clientIdSuccess } = ClientIdSchema.safeParse(
			searchParams.client_id,
		)
		if (!clientIdSuccess) {
			redirectFail(redirectUri, { error: "unauthorized_client", state })
			return
		}

		// `scope`の検証
		const { success: scopeSuccess } = ScopeSchema.safeParse(searchParams.scope)
		if (!scopeSuccess) {
			redirectFail(redirectUri, { error: "invalid_scope", state })
			return
		}

		// `nonce`の検証
		const { success: nonceSuccess } = NonceSchema.safeParse(searchParams.nonce)
		if (!nonceSuccess) {
			redirectFail(redirectUri, { error: "invalid_request", state })
			return
		}

		// `code_challenge`の検証
		const { success: codeChallengeSuccess } = CodeChallengeSchema.safeParse(
			searchParams.code_challenge,
		)
		if (!codeChallengeSuccess) {
			redirectFail(redirectUri, { error: "invalid_request", state })
			return
		}

		// `code_challenge_method`の検証
		const { success: codeChallengeMethodSuccess } =
			CodeChallengeMethodSchema.safeParse(searchParams.code_challenge_method)
		if (!codeChallengeMethodSuccess) {
			redirectFail(redirectUri, { error: "invalid_request", state })
			return
		}

		setIsValidating(false)
	}, [searchParams, redirectFail])

	return { isValidating }
}
