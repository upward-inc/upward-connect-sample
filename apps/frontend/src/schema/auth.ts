import z from "zod"

// 指定可能なスコープ
export const specifiedScopes = ["openid", "profile", "email", "offline_access"]

export const ResponseTypeSchema = z.literal("code")
export const ClientIdSchema = z.string().min(1)
export const AuthorizeParamsRedirectUriSchema = z.string().min(1)
export const ScopeSchema = z
	.string()
	.refine(
		(value) =>
			value.trim().length > 0 &&
			value.split(" ").every((scope) => specifiedScopes.includes(scope)),
	)
export const StateSchema = z.string().min(1)
export const NonceSchema = z.string().min(1)
export const CodeChallengeSchema = z.string().min(43).max(128)
export const CodeChallengeMethodSchema = z.literal("S256")

// 検索パラメータ一覧を表現するスキーマ
// バリデーション実装の都合、すべてのパラメータをoptionalで定義
export const SearchParamsSchema = z.object({
	response_type: z.string().optional(),
	client_id: z.string().optional(),
	redirect_uri: z.string().optional(),
	scope: z.string().optional(),
	state: z.string().optional(),
	nonce: z.string().optional(),
	code_challenge: z.string().optional(),
	code_challenge_method: z.string().optional(),
})

export type SearchParams = z.output<typeof SearchParamsSchema>

// OAuth2認可リクエストのパラメータ一覧を表現するスキーマ
export const AuthorizeParamsSchema = z.object({
	response_type: ResponseTypeSchema,
	client_id: ClientIdSchema,
	redirect_uri: AuthorizeParamsRedirectUriSchema,
	scope: ScopeSchema,
	state: StateSchema,
	nonce: NonceSchema,
	code_challenge: CodeChallengeSchema,
	code_challenge_method: CodeChallengeMethodSchema,
})

export interface AuthorizeResultSuccess {
	code: string
	state?: string
}

export interface AuthorizeResultFailure {
	error: AuthorizeError
	error_description?: string
	state?: string
}

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
