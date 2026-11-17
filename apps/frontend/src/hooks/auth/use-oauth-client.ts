import { useEffect, useMemo, useState } from "react"
import { env } from "../../env"
import {
	type OAuthClient,
	type OAuthClientFetchResult,
	OAuthClientResponseSchema,
} from "../../schema/oauth-client"

// 取得が完了したクライアント情報（取得に失敗した場合は `client` が `null`）
interface FetchedClient {
	clientId: string
	client: OAuthClient | null
}

/**
 * クライアント情報を取得するフック
 *
 * `clientId` が未指定の場合や、クライアントが見つからない・応答の形式が不正な場合・応答のクライアント ID が `clientId` と一致しない場合は、取得失敗として返す。
 * `clientId` が変わった場合は、新しい `clientId` の取得が完了するまで取得中として返し、前のクライアント情報は返さない。
 * 戻り値は取得状態が変わらない限り同じオブジェクトを返すため、`useEffect` の依存配列に指定できる。
 */
export function useOAuthClient(
	clientId: string | undefined,
): OAuthClientFetchResult {
	const [fetched, setFetched] = useState<FetchedClient | null>(null)

	useEffect(() => {
		if (!clientId) {
			return
		}

		// クリーンアップ用のフラグ
		let isCancelled = false

		const fetchClientInfo = async () => {
			let client: OAuthClient | null = null
			try {
				const response = await fetch(
					`${env.API_URL}/auth/clients/${encodeURIComponent(clientId)}`,
					{
						credentials: "include",
					},
				)

				const { success, data } = OAuthClientResponseSchema.safeParse(
					await response.json(),
				)

				// 取得したクライアント情報で redirect_uri を検証するため、指定したクライアントのものであることを確認する
				if (response.ok && success && data.id === clientId) {
					client = data
				}
			} catch {
				// 通信エラーや応答の解析失敗も、取得失敗として扱う
			}

			if (!isCancelled) {
				setFetched({ clientId, client })
			}
		}

		fetchClientInfo()

		return () => {
			isCancelled = true
		}
	}, [clientId])

	return useMemo(() => {
		if (!clientId) {
			return { isSuccess: false, isFetching: false }
		}
		if (fetched?.clientId !== clientId) {
			return { isFetching: true }
		}
		if (!fetched.client) {
			return { isSuccess: false, isFetching: false }
		}
		return { isSuccess: true, ...fetched.client, isFetching: false }
	}, [clientId, fetched])
}
