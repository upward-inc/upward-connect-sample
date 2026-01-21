import type { AuthorizeError } from "./auth"

export type OAuthClientFetchResult =
	| (OAuthClientFetchResultSuccess | OAuthClientFetchResultFailure)
	| { isFetching: true }

export interface OAuthClientFetchResultSuccess {
	isSuccess: true
	name: string
	isFetching: false
}

export interface OAuthClientFetchResultFailure {
	isSuccess: false
	error: AuthorizeError
	error_description?: string
	isFetching: false
}
