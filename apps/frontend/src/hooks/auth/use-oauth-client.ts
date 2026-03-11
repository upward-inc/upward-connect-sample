import { useEffect, useState } from "react"
import { env } from "../../env"
import type { OAuthClientFetchResult } from "../../schema/oauth-client"

/**
 * クライアント情報を取得するフック
 */
export function useOAuthClient(
	isValidating: boolean,
	clientId: string | undefined,
): OAuthClientFetchResult {
	const [clientName, setClientName] = useState<string | null>(null)
	const [isFetching, setIsFetching] = useState(true)

	useEffect(() => {
		// クリーンアップ用のフラグ
		let isCancelled = false

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

					if (!isCancelled && response.ok && client.name) {
						setClientName(client.name)
					}
				} finally {
					if (!isCancelled) {
						setIsFetching(false)
					}
				}
			}

			fetchClientInfo()
		} else if (!isValidating) {
			setIsFetching(false)
		}

		return () => {
			isCancelled = true
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
