import { getOAuthClientById } from "./get-oauth-client"

export type AuthorizeError =
	// see: https://www.rfc-editor.org/rfc/rfc6749.html#section-4.1.2.1
	| "invalid_request" // リクエストに必須パラメータが欠落している、無効なパラメータ値が含まれている、パラメータが複数回含まれている、またはその他の理由で形式が正しくない
	| "unauthorized_client" // クライアントはこのメソッドを使用して認証コードを要求する権限がない
	| "access_denied" // リソース所有者または認可サーバーがリクエストを拒否した
	| "unsupported_response_type" // 認可サーバーはこのメソッドによる認可コードの取得をサポートしていない
	| "invalid_scope" // 要求されたスコープが無効、不明、または不正な形式である
	| "server_error" // 認可サーバーがリクエストを処理できない予期せぬ状態に遭遇した
	| "temporarily_unavailable" // 認可サーバーは、サーバーの一時的な過負荷またはメンテナンスのため、リクエストを処理できない

	// see: https://openid-foundation-japan.github.io/openid-connect-core-1_0.ja.html#AuthError
	| "interaction_required" // Authorization Server は処理を進めるためにいくつかの End-User interaction を必要とする. Authentication Request 中の prompt パラメータが none であるが, End-User interaction のためのユーザーインターフェースの表示なしには Authentication Request が完了できない時にこのエラーが返される
	| "login_required" // Authorization Server は End-User の認証を必要とする. Authentication Request 中の prompt パラメータが none であるが, End-User の認証のためのユーザーインターフェースの表示なしには Authentication Request が完了できない時にこのエラーが返される
	| "account_selection_required" // End-User は Authorization Server にてセッションの選択を必要とされる (REQUIRED). End-User は Authorization Server にて異なるアカウントで認証されているが, セッションを選択していないかもしれない (MAY). Authentication Request 中の prompt パラメータが none であるが, 利用するセッションを選択するためのユーザーインターフェースの表示なしには Authentication Request が完了できない時にこのエラーが返される
	| "consent_required" // Authorization Server は End-User の同意を必要とする. Authentication Request 中の prompt パラメータが none であるが, End-User の同意のためのユーザーインターフェースの表示なしには Authentication Request が完了できない時にこのエラーが返される
	| "invalid_request_uri" // Authorization Request 中の request_uri はエラーを返すか, 無効なデータを含む
	| "invalid_request_object" // request パラメータが無効な Request Object を含む
	| "request_not_supported" // OP は Section 6 にて定義されている request パラメータをサポートしていない
	| "request_uri_not_supported" // OP は Section 6 にて定義されている request_uri パラメータをサポートしていない
	| "registration_not_supported" // OP は Section 7.2.1 で定義されている registration パラメータをサポートしていない

interface AuthorizeParams {
	response_type: string | null
	client_id: string | null
	redirect_uri: string | null
	scope?: string | undefined
	state?: string | undefined
}

type AuthorizeResult = AuthorizeResultSuccess | AuthorizeResultFailure

interface AuthorizeResultSuccess {
	success: true
	response_type: string
	client_id: string
	client_secret: string
	redirect_uri: string
	scope: string | undefined
	state: string | undefined
}

interface AuthorizeResultFailure {
	success: false
	error: AuthorizeError
	error_description?: string
}

/**
 * 認可パラメータの検証を行う
 *
 * @see [RFC6749 OAuth 2.0](https://www.rfc-editor.org/rfc/rfc6749.html)
 * @see [OpenID Connect Core 1.0 - 3.1. Authentication using the Authorization Code Flow](https://openid.net/specs/openid-connect-core-1_0.html#CodeFlowAuth)
 * @see [OpenID Connect Core 1.0 - 3.1. Authentication using the Authorization Code Flow (Japanese)](https://openid-foundation-japan.github.io/openid-connect-core-1_0.ja.html#CodeFlowAuth)
 */
export const validateAuthorizeParams = async (
	params: AuthorizeParams,
): Promise<AuthorizeResult> => {
	try {
		// TODO: scopeの検証

		if (params.response_type !== "code") {
			return { success: false, error: "invalid_request" }
		}
		if (!params.client_id) {
			return { success: false, error: "invalid_request" }
		}
		if (!params.redirect_uri) {
			return { success: false, error: "invalid_request" }
		}

		const oauthClient = await getOAuthClientById(params.client_id)

		// 登録済みクライアントIDの存在確認
		if (!oauthClient) {
			return { success: false, error: "invalid_request" }
		}

		// redirect_uriがクライアントIDに対して登録されたものと完全一致していることの確認
		if (!oauthClient.redirect_uris.includes(params.redirect_uri)) {
			return { success: false, error: "invalid_request" }
		}

		return {
			success: true,
			response_type: params.response_type,
			client_id: params.client_id,
			client_secret: oauthClient.secret,
			redirect_uri: params.redirect_uri,
			scope: params.scope,
			state: params.state,
		}
	} catch {
		return { success: false, error: "server_error" }
	}
}
