import { useEffect, useMemo } from "react"
import type { z } from "zod"
import {
	type AuthorizeParams,
	AuthorizeParamsRedirectUriSchema,
	type AuthorizeResultFailure,
	CodeChallengeMethodSchema,
	CodeChallengeSchema,
	hasOnlyRegisteredScopes,
	NonceSchema,
	ResponseTypeSchema,
	ScopeSchema,
	type SearchParamsSchema,
	StateSchema,
} from "../../schema/auth"
import type {
	OAuthClient,
	OAuthClientFetchResult,
} from "../../schema/oauth-client"

export type AuthorizeValidationResult =
	| { isValid: false }
	| { isValid: true; params: AuthorizeParams; client: OAuthClient }

// 検証の判定結果（副作用はフック側の effect で実行する）
type Verdict =
	| { type: "pending" }
	| { type: "fatal"; alertMessage: string; errorMessage: string }
	| { type: "redirect"; redirectUri: string; failure: AuthorizeResultFailure }
	| { type: "valid"; params: AuthorizeParams; client: OAuthClient }

const judge = (
	searchParams: z.output<typeof SearchParamsSchema>,
	oauthClientFetchResult: OAuthClientFetchResult,
): Verdict => {
	// `redirect_uri`の検証
	const { success: redirectUriSuccess, data: redirectUri } =
		AuthorizeParamsRedirectUriSchema.safeParse(searchParams.redirect_uri)
	if (!redirectUriSuccess) {
		// オープンリダイレクト攻撃を防止するため、リダイレクトを行ってはならない
		return {
			type: "fatal",
			alertMessage: "redirect_uriが不正です",
			errorMessage: "invalid redirect_uri",
		}
	}

	// `redirect_uri`の検証に必要なクライアント情報の取得を待つ
	if (oauthClientFetchResult.isFetching) {
		return { type: "pending" }
	}

	// `client_id`の検証
	if (!oauthClientFetchResult.isSuccess) {
		// クライアントを特定できない場合は`redirect_uri`を検証できないため、リダイレクトを行ってはならない
		return {
			type: "fatal",
			alertMessage: "client_idが不正です",
			errorMessage: "invalid client_id",
		}
	}
	const { client } = oauthClientFetchResult

	// `redirect_uri`がクライアントに登録されたものと一致することの検証
	if (!client.redirect_uris.includes(redirectUri)) {
		return {
			type: "fatal",
			alertMessage: "redirect_uriが不正です",
			errorMessage: "invalid redirect_uri",
		}
	}

	// `state`の検証
	const { success: stateSuccess, data: state } = StateSchema.safeParse(
		searchParams.state,
	)
	if (!stateSuccess) {
		return {
			type: "redirect",
			redirectUri,
			failure: { error: "invalid_request", state },
		}
	}

	// `response_type`の検証
	const { success: responseTypeSuccess, data: responseType } =
		ResponseTypeSchema.safeParse(searchParams.response_type)
	if (!responseTypeSuccess) {
		return {
			type: "redirect",
			redirectUri,
			failure: { error: "unsupported_response_type", state },
		}
	}

	// `scope`の検証（形式と、クライアントに登録されたスコープのみであること）
	const { success: scopeSuccess, data: scope } = ScopeSchema.safeParse(
		searchParams.scope,
	)
	if (!scopeSuccess || !hasOnlyRegisteredScopes(scope, client.scopes)) {
		return {
			type: "redirect",
			redirectUri,
			failure: { error: "invalid_scope", state },
		}
	}

	// `nonce`の検証
	const { success: nonceSuccess, data: nonce } = NonceSchema.safeParse(
		searchParams.nonce,
	)
	if (!nonceSuccess) {
		return {
			type: "redirect",
			redirectUri,
			failure: { error: "invalid_request", state },
		}
	}

	// `code_challenge`の検証
	const { success: codeChallengeSuccess, data: codeChallenge } =
		CodeChallengeSchema.safeParse(searchParams.code_challenge)
	if (!codeChallengeSuccess) {
		return {
			type: "redirect",
			redirectUri,
			failure: { error: "invalid_request", state },
		}
	}

	// `code_challenge_method`の検証
	const { success: codeChallengeMethodSuccess, data: codeChallengeMethod } =
		CodeChallengeMethodSchema.safeParse(searchParams.code_challenge_method)
	if (!codeChallengeMethodSuccess) {
		return {
			type: "redirect",
			redirectUri,
			failure: { error: "invalid_request", state },
		}
	}

	return {
		type: "valid",
		params: {
			response_type: responseType,
			// `useOAuthClient` が応答のクライアント ID と `client_id` の一致を確認済み
			client_id: client.id,
			redirect_uri: redirectUri,
			scope,
			state,
			nonce,
			code_challenge: codeChallenge,
			code_challenge_method: codeChallengeMethod,
		},
		client,
	}
}

/**
 * 認可パラメータのバリデーションフック
 *
 * `redirect_uri` がクライアントに登録されたものと一致することを確認するまで、エラーのリダイレクトは行わない。
 * `client_id` や `redirect_uri` に不備がある場合は、オープンリダイレクトを防ぐためリダイレクトせずにエラーを投げる。
 * それ以外のパラメータに不備がある場合は、`redirectFail` でエラーをリダイレクトする。
 *
 * @param oauthClientFetchResult - `client_id` のクライアント情報の取得結果。取得中は検証を完了しない
 * @returns すべての検証に成功した場合のみ、検証済みのパラメータとクライアント情報を返す
 *
 * @see [RFC6749 OAuth 2.0 - 4.1.2.1. Error Response](https://www.rfc-editor.org/rfc/rfc6749.html#section-4.1.2.1)
 * @see [OpenID Connect Core 1.0 - 3.1. Authentication using the Authorization Code Flow](https://openid.net/specs/openid-connect-core-1_0.html#CodeFlowAuth)
 * @see [OpenID Connect Core 1.0 - 3.1. Authentication using the Authorization Code Flow (Japanese)](https://openid-foundation-japan.github.io/openid-connect-core-1_0.ja.html#CodeFlowAuth)
 */
export function useAuthorizeValidation(
	searchParams: z.output<typeof SearchParamsSchema>,
	oauthClientFetchResult: OAuthClientFetchResult,
	redirectFail: (url: string, result: AuthorizeResultFailure) => void,
): AuthorizeValidationResult {
	const verdict = useMemo(
		() => judge(searchParams, oauthClientFetchResult),
		[searchParams, oauthClientFetchResult],
	)

	// 検証に失敗した場合の副作用（エラーの送出・リダイレクト）
	useEffect(() => {
		if (verdict.type === "fatal") {
			alert(verdict.alertMessage)
			throw new Error(verdict.errorMessage)
		}
		if (verdict.type === "redirect") {
			redirectFail(verdict.redirectUri, verdict.failure)
		}
	}, [verdict, redirectFail])

	if (verdict.type !== "valid") {
		return { isValid: false }
	}
	return { isValid: true, params: verdict.params, client: verdict.client }
}
