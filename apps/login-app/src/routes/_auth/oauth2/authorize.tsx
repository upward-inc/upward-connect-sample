import { createFileRoute, useSearch } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { z } from "zod"
import { useAuth } from "../../../auth"
import { Button } from "../../../components/button"
import { env } from "../../../env"

// OAuth2認可リクエストのパラメータと同等のクエリパラメータを受け取る
const SearchParamsSchema = z.object({
	response_type: z.string().optional(),
	client_id: z.string().optional(),
	redirect_uri: z.string().optional(),
	scope: z.string().optional(),
	state: z.string().optional(),
	nonce: z.string().optional(),
})

const AuthorizeParamsRedirectUriSchema = z.url().startsWith("https://")

const AuthorizeParamsWithoutRedirectUriSchema = z.object({
	response_type: z.literal("code"),
	client_id: z.string(),
	scope: z.string().optional(),
	state: z.string().optional(),
	nonce: z.string().optional(),
})

const AuthorizeParamsSchema = AuthorizeParamsWithoutRedirectUriSchema.extend({
	redirect_uri: AuthorizeParamsRedirectUriSchema,
})

interface AuthorizeResultSuccess {
	code: string
	state?: string
}

interface AuthorizeResultFailure {
	error: AuthorizeError
	error_description?: string
	state?: string
}

type OAuthClientFetchResult =
	| (OAuthClientFetchResultSuccess | OAuthClientFetchResultFailure)
	| { isFetching: true }

interface OAuthClientFetchResultSuccess {
	isSuccess: true
	name: string
	isFetching: false
}

interface OAuthClientFetchResultFailure {
	isSuccess: false
	error: AuthorizeError
	error_description?: string
	isFetching: false
}

type AuthorizeError =
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

export const Route = createFileRoute("/_auth/oauth2/authorize")({
	validateSearch: SearchParamsSchema,
	component: AuthorizePage,
})

// バリデーション結果の型
interface ValidationResult {
	redirectUri: z.ZodSafeParseResult<string>
	withoutRedirectUri: z.ZodSafeParseResult<
		z.output<typeof AuthorizeParamsWithoutRedirectUriSchema>
	>
}

/**
 * 認可パラメータのバリデーションフック
 *
 * @see [RFC6749 OAuth 2.0](https://www.rfc-editor.org/rfc/rfc6749.html)
 * @see [OpenID Connect Core 1.0 - 3.1. Authentication using the Authorization Code Flow](https://openid.net/specs/openid-connect-core-1_0.html#CodeFlowAuth)
 * @see [OpenID Connect Core 1.0 - 3.1. Authentication using the Authorization Code Flow (Japanese)](https://openid-foundation-japan.github.io/openid-connect-core-1_0.ja.html#CodeFlowAuth)
 */
function useAuthorizeValidation(
	searchParams: z.output<typeof SearchParamsSchema>,
) {
	const [isValidating, setIsValidating] = useState(true)

	// クエリパラメータを検証
	const validationResult: ValidationResult = {
		redirectUri: AuthorizeParamsRedirectUriSchema.safeParse(
			searchParams.redirect_uri,
		),
		withoutRedirectUri:
			AuthorizeParamsWithoutRedirectUriSchema.safeParse(searchParams),
	}

	useEffect(() => {
		if (!validationResult.redirectUri.success) {
			// `redirect_uri`に不備がある場合は、エラーをスロー
			// オープンリダイレクト攻撃を防止するため、リダイレクトを行ってはならない
			throw new Error("invalid redirect_uri")
		}

		if (!validationResult.withoutRedirectUri.success) {
			// `redirect_uri`以外のパラメータに不備がある場合は、リダイレクト
			redirectFail(validationResult.redirectUri.data, {
				error: "invalid_request",
				state: searchParams.state,
			})
		}

		setIsValidating(false)
	}, [
		validationResult.redirectUri,
		validationResult.withoutRedirectUri,
		searchParams.state,
	])

	return { isValidating }
}

/**
 * クライアント情報を取得するフック
 */
function useOAuthClient(
	isValidating: boolean,
	clientId: string | undefined,
	token: string | null,
): OAuthClientFetchResult {
	const [clientName, setClientName] = useState<string | null>(null)
	const [isFetching, setIsFetching] = useState(true)

	useEffect(() => {
		if (!isValidating && clientId && token) {
			const fetchClientInfo = async () => {
				try {
					setIsFetching(true)

					const response = await fetch(
						`${env.API_URL}/auth/clients/${clientId}`,
						{
							headers: { authorization: `Bearer ${token}` },
						},
					)

					const client = await response.json()

					if (response.ok && client.name) {
						setClientName(client.name)
					}
				} finally {
					setIsFetching(false)
				}
			}

			fetchClientInfo()
		} else if (!isValidating) {
			setIsFetching(false)
		}
	}, [isValidating, clientId, token])

	if (isFetching) {
		return { isFetching }
	}
	if (!clientName) {
		// 見つからない場合は全てエラーとする
		return { isSuccess: false, error: "invalid_request", isFetching }
	}
	return { isSuccess: true, name: clientName, isFetching }
}

// リクエスト成功時のリダイレクト処理
const redirectSuccess = (url: string, code: string, state?: string) => {
	const redirectUrl = new URL(url)
	redirectUrl.searchParams.append("code", code)
	if (state) {
		redirectUrl.searchParams.append("state", state)
	}
	window.location.href = redirectUrl.toString()
}

// リダイレクト失敗時のリダイレクト処理
const redirectFail = (url: string, result: AuthorizeResultFailure) => {
	const redirectUrl = new URL(url)
	redirectUrl.searchParams.append("error", result.error)
	if (result.error_description) {
		redirectUrl.searchParams.append(
			"error_description",
			result.error_description,
		)
	}
	if (result.state) {
		redirectUrl.searchParams.append("state", result.state)
	}
	window.location.href = redirectUrl.toString()
}

function AuthorizePage() {
	const { token } = useAuth()

	const searchParams = useSearch({ from: "/_auth/oauth2/authorize" })

	// ページリクエスト時のバリデーション（クライアントサイドでの最低限の検証）
	const { isValidating } = useAuthorizeValidation(searchParams)

	// バリデーション完了後にクライアント情報を取得
	const oauthClientFetchResult = useOAuthClient(
		isValidating,
		searchParams.client_id,
		token,
	)

	// 許可時の処理
	const handleAuthorize = async () => {
		const strictQueryParams = AuthorizeParamsSchema.parse(searchParams)

		const formData = new FormData()
		formData.append("client_id", strictQueryParams.client_id)
		formData.append("redirect_uri", strictQueryParams.redirect_uri)
		formData.append("response_type", strictQueryParams.response_type)
		if (strictQueryParams.scope) {
			formData.append("scope", strictQueryParams.scope)
		}
		if (strictQueryParams.state) {
			formData.append("state", strictQueryParams.state)
		}
		if (strictQueryParams.nonce) {
			formData.append("nonce", strictQueryParams.nonce)
		}

		// サーバーサイドで検証
		const response = await fetch(`${env.API_URL}/auth/authorize`, {
			method: "POST",
			headers: {
				authorization: `Bearer ${token}`,
			},
			body: formData,
		})

		if (!response.ok) {
			const result: AuthorizeResultFailure = await response.json()

			if (result.error === "invalid_request_uri") {
				// `redirect_uri`に不備がある場合は、エラーをスロー
				// オープンリダイレクト攻撃を防止するため、リダイレクトを行ってはならない
				throw new Error("invalid redirect_uri")
			}

			redirectFail(strictQueryParams.redirect_uri, {
				error:
					response.status === 503 ? "temporarily_unavailable" : result.error,
				error_description: result.error_description,
				state: result.state,
			})
			return
		}

		const { code, state }: AuthorizeResultSuccess = await response.json()

		redirectSuccess(strictQueryParams.redirect_uri, code, state)
	}

	// 拒否時の処理
	const handleDeny = () => {
		const strictQueryParams = AuthorizeParamsSchema.parse(searchParams)

		redirectFail(strictQueryParams.redirect_uri, {
			error: "access_denied",
			state: strictQueryParams.state,
		})
	}

	if (isValidating) {
		return null
	}

	if (oauthClientFetchResult.isFetching) {
		return null
	}

	if (!oauthClientFetchResult.isSuccess) {
		// クライアント情報の取得に失敗した場合（≒ 不適切なクライアントIDの指定）は、エラーをリダイレクト
		const strictQueryParams = AuthorizeParamsSchema.parse(searchParams)
		redirectFail(strictQueryParams.redirect_uri, {
			error: oauthClientFetchResult.error,
			error_description: oauthClientFetchResult.error_description,
			state: strictQueryParams.state,
		})
		return null
	}

	return (
		<div className="flex items-center justify-center min-h-screen bg-gray-100">
			<div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-gray-900">
						アプリケーション認可
					</h1>
				</div>

				<div>
					<p className="text-sm text-gray-800">
						「{oauthClientFetchResult.name}
						」が以下のスコープへのアクセスを要求しています
					</p>
					<ul className="list-disc pl-5 mb-4">
						{searchParams.scope?.split(" ").map((scope) => (
							<li key={scope} className="mb-1">
								{scope}
							</li>
						))}
					</ul>
					<p className="text-sm text-gray-800">
						このアプリケーションにアクセスを許可しますか？
					</p>
				</div>

				<div className="space-y-3">
					<Button onClick={handleAuthorize}>許可する</Button>
					<Button
						className="bg-neutral-600 hover:bg-neutral-700"
						onClick={handleDeny}
					>
						拒否する
					</Button>
				</div>
			</div>
		</div>
	)
}
