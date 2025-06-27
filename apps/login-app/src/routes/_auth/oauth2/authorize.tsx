import { createFileRoute } from "@tanstack/react-router"
import { useSearch } from "@tanstack/react-router"
import { useEffect } from "react"
import { z } from "zod"
import { Button } from "../../../components/button"

// see: RFC 6749 - 4.1.1. Authorization Request (https://datatracker.ietf.org/doc/html/rfc6749#section-4.1)

// TODO: 環境変数の使用
// TODO: ログイン後に表示できるようにする（未ログイン時はログイン画面を経由する）
// TODO: client_idの検証
// TODO: scopeの検証
// TODO: stateの検証

// OAuth2認可リクエストのパラメータと同等のクエリパラメータを受け取る
const SearchParamsSchema = z.object({
	response_type: z.string().optional(),
	client_id: z.string().optional(),
	redirect_uri: z.string().optional(),
	scope: z.string().optional(),
	state: z.string().optional(),
})

const AuthorizeParamsRedirectUriSchema = z.string().url().startsWith("https://")

const AuthorizeParamsWithoutRedirectUriSchema = z.object({
	response_type: z.literal("code"),
	client_id: z.string(),
	scope: z.string().optional(),
	state: z.string().optional(),
})

const AuthorizeParamsSchema = AuthorizeParamsWithoutRedirectUriSchema.extend({
	redirect_uri: AuthorizeParamsRedirectUriSchema,
})

type AuthorizeError =
	| "invalid_request" // リクエストに必須パラメータが欠落している、無効なパラメータ値が含まれている、パラメータが複数回含まれている、またはその他の理由で形式が正しくない
	| "unauthorized_client" // クライアントはこのメソッドを使用して認証コードを要求する権限がない
	| "access_denied" // リソース所有者または認可サーバーがリクエストを拒否した
	| "unsupported_response_type" // 認可サーバーはこのメソッドによる認可コードの取得をサポートしていない
	| "invalid_scope" // 要求されたスコープが無効、不明、または不正な形式である
	| "server_error" // 認可サーバーがリクエストを処理できない予期せぬ状態に遭遇した
	| "temporarily_unavailable" // 認可サーバーは、サーバーの一時的な過負荷またはメンテナンスのため、リクエストを処理できない

export const Route = createFileRoute("/_auth/oauth2/authorize")({
	validateSearch: SearchParamsSchema,
	component: AuthorizePage,
})

function AuthorizePage() {
	const searchParams = useSearch({ from: "/_auth/oauth2/authorize" })

	// クエリパラメータを検証
	const validationResult = {
		redirectUri: AuthorizeParamsRedirectUriSchema.safeParse(
			searchParams.redirect_uri,
		),
		withoutRedirectUri:
			AuthorizeParamsWithoutRedirectUriSchema.safeParse(searchParams),
	}

	// ページリクエスト時のバリデーション
	useEffect(() => {
		if (!validationResult.redirectUri.success) {
			// `redirect_uri`に不備がある場合は、エラーをスロー
			// オープンリダイレクト攻撃を防止するため、リダイレクトを行ってはならない
			throw new Error("invalid redirect_uri")
		}

		if (!validationResult.withoutRedirectUri.success) {
			// `redirect_uri`以外のパラメータに不備がある場合は、リダイレクト
			redirectWithError(validationResult.redirectUri.data, "invalid_request")
		}
	}, [validationResult.redirectUri, validationResult.withoutRedirectUri])

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

		const response = await fetch("http://localhost:8787/api/auth/authorize", {
			method: "POST",
			body: formData,
		})

		if (!response.ok) {
			const error: AuthorizeError =
				response.status === 503 ? "temporarily_unavailable" : "server_error"

			redirectWithError(strictQueryParams.redirect_uri, error)
			return
		}

		const { code }: { code: string } = await response.json()

		redirectWithCode(strictQueryParams.redirect_uri, code)
	}

	// 拒否時の処理
	const handleDeny = () => {
		const strictQueryParams = AuthorizeParamsSchema.parse(searchParams)

		redirectWithError(strictQueryParams.redirect_uri, "access_denied")
	}

	// リクエスト成功時のリダイレクト処理
	const redirectWithCode = (url: string, code: string) => {
		const redirectUrl = new URL(url)
		redirectUrl.searchParams.append("code", code)
		window.location.href = redirectUrl.toString()
	}

	// リクエスト失敗時のリダイレクト処理
	const redirectWithError = (url: string, error: AuthorizeError) => {
		const redirectUrl = new URL(url)
		redirectUrl.searchParams.append("error", error)
		window.location.href = redirectUrl.toString()
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
						「{searchParams.client_id}
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
