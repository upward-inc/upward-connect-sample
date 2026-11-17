import z from "zod"

// クライアント情報取得 API（`GET /auth/clients/:id`）の応答のうち、認可画面で使う項目
export const OAuthClientResponseSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	scopes: z.array(z.string()),
	redirect_uris: z.array(z.string()),
})

export type OAuthClient = z.output<typeof OAuthClientResponseSchema>

export type OAuthClientFetchResult =
	| (OAuthClientFetchResultSuccess | OAuthClientFetchResultFailure)
	| { isFetching: true }

export interface OAuthClientFetchResultSuccess {
	isSuccess: true
	isFetching: false
	client: OAuthClient
}

export interface OAuthClientFetchResultFailure {
	isSuccess: false
	isFetching: false
}
