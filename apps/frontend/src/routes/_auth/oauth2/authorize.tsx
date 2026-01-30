import { createFileRoute, useSearch } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { Button } from "../../../components/button"
import { env } from "../../../env"
import { useAuthorizeValidation } from "../../../hooks/auth/use-authorize-validation"
import {
	type AuthorizeError,
	AuthorizeParamsSchema,
	type AuthorizeResultFailure,
	type AuthorizeResultSuccess,
	SearchParamsSchema,
	type specifiedScopes,
} from "../../../schema/auth"

// スコープの説明
const scopeDescriptions: Record<(typeof specifiedScopes)[number], string> = {
	openid: "IDトークン発行",
	profile: "プロフィール情報",
	email: "メールアドレス",
	offline_access: "リフレッシュトークン発行",
} as const

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

export const Route = createFileRoute("/_auth/oauth2/authorize")({
	validateSearch: SearchParamsSchema,
	component: AuthorizePage,
})

/**
 * クライアント情報を取得するフック
 */
function useOAuthClient(
	isValidating: boolean,
	clientId: string | undefined,
): OAuthClientFetchResult {
	const [clientName, setClientName] = useState<string | null>(null)
	const [isFetching, setIsFetching] = useState(true)

	useEffect(() => {
		if (!isValidating && clientId) {
			const fetchClientInfo = async () => {
				try {
					setIsFetching(true)

					const response = await fetch(
						`${env.API_URL}/auth/clients/${clientId}`,
						{
							credentials: "include",
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
	}, [isValidating, clientId])

	if (isFetching) {
		return { isFetching }
	}
	if (!clientName) {
		// 見つからない場合は全てエラーとする
		return { isSuccess: false, error: "unauthorized_client", isFetching }
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

export function AuthorizePage() {
	const searchParams = useSearch({ from: "/_auth/oauth2/authorize" })

	// ページリクエスト時のバリデーション（クライアントサイドでの最低限の検証）
	const { isValidating } = useAuthorizeValidation(searchParams, redirectFail)

	// バリデーション完了後にクライアント情報を取得
	const oauthClientFetchResult = useOAuthClient(
		isValidating,
		searchParams.client_id,
	)

	// 許可時の処理
	const handleAuthorize = async () => {
		const strictQueryParams = AuthorizeParamsSchema.parse(searchParams)

		const formData = new FormData()
		formData.append("client_id", strictQueryParams.client_id)
		formData.append("redirect_uri", strictQueryParams.redirect_uri)
		formData.append("response_type", strictQueryParams.response_type)
		formData.append("scope", strictQueryParams.scope)
		formData.append("state", strictQueryParams.state)
		formData.append("nonce", strictQueryParams.nonce)
		formData.append("code_challenge", strictQueryParams.code_challenge)
		formData.append(
			"code_challenge_method",
			strictQueryParams.code_challenge_method,
		)

		// サーバーサイドで検証
		const response = await fetch(`${env.API_URL}/auth/authorize`, {
			method: "POST",
			credentials: "include",
			body: formData,
		})

		if (!response.ok) {
			const result: AuthorizeResultFailure = await response.json()

			if (result.error === "invalid_request_uri") {
				// `redirect_uri`に不備がある場合は、エラーをスロー
				// オープンリダイレクト攻撃を防止するため、リダイレクトを行ってはならない
				alert("redirect_uriが不正です")
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
								{scopeDescriptions[scope]
									? `（${scopeDescriptions[scope]}）`
									: ""}
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
