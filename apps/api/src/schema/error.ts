import { z } from "../libs/zod"

export const OAuthApiErrorResultSchema = z
	.object({
		error: z
			.literal([
				// see: https://www.rfc-editor.org/rfc/rfc6749.html#section-4.1.2.1
				"invalid_request", // リクエストに必須パラメータが欠落している、無効なパラメータ値が含まれている、パラメータが複数回含まれている、またはその他の理由で形式が正しくない
				"unauthorized_client", // クライアントはこのメソッドを使用して認証コードを要求する権限がない
				"access_denied", // リソース所有者または認可サーバーがリクエストを拒否した
				"unsupported_response_type", // 認可サーバーはこのメソッドによる認可コードの取得をサポートしていない
				"invalid_scope", // 要求されたスコープが無効、不明、または不正な形式である
				"server_error", // 認可サーバーがリクエストを処理できない予期せぬ状態に遭遇した
				"temporarily_unavailable", // 認可サーバーは、サーバーの一時的な過負荷またはメンテナンスのため、リクエストを処理できない

				// see: https://www.rfc-editor.org/rfc/rfc6749.html#section-5.2
				"invalid_client", // クライアント認証に失敗した
				"invalid_grant", // 提供された認可グラント（認可コード、リフレッシュトークンなど）が無効、取り消されている、期限切れ、または発行元と一致しない
				"unsupported_grant_type", // サポートされていない認可グラントタイプが指定された

				// see: https://openid-foundation-japan.github.io/openid-connect-core-1_0.ja.html#AuthError
				"interaction_required", // Authorization Server は処理を進めるためにいくつかの End-User interaction を必要とする. Authentication Request 中の prompt パラメータが none であるが, End-User interaction のためのユーザーインターフェースの表示なしには Authentication Request が完了できない時にこのエラーが返される
				"login_required", // Authorization Server は End-User の認証を必要とする. Authentication Request 中の prompt パラメータが none であるが, End-User の認証のためのユーザーインターフェースの表示なしには Authentication Request が完了できない時にこのエラーが返される
				"account_selection_required", // End-User は Authorization Server にてセッションの選択を必要とされる (REQUIRED). End-User は Authorization Server にて異なるアカウントで認証されているが, セッションを選択していないかもしれない (MAY). Authentication Request 中の prompt パラメータが none であるが, 利用するセッションを選択するためのユーザーインターフェースの表示なしには Authentication Request が完了できない時にこのエラーが返される
				"consent_required", // Authorization Server は End-User の同意を必要とする. Authentication Request 中の prompt パラメータが none であるが, End-User の同意のためのユーザーインターフェースの表示なしには Authentication Request が完了できない時にこのエラーが返される
				"invalid_request_uri", // Authorization Request 中の request_uri はエラーを返すか, 無効なデータを含む
				"invalid_request_object", // request パラメータが無効な Request Object を含む
				"request_not_supported", // OP は Section 6 にて定義されている request パラメータをサポートしていない
				"request_uri_not_supported", // OP は Section 6 にて定義されている request_uri パラメータをサポートしていない
				"registration_not_supported", // OP は Section 7.2.1 で定義されている registration パラメータをサポートしていない

				// see: https://openid-foundation-japan.github.io/openid-connect-core-1_0.ja.html#UserInfoError
				"invalid_token", // 提供されたアクセストークンが無効、期限切れ、または発行元と一致しない
			])
			.meta({
				description: "エラーコード",
				example: "invalid_request",
			}),
		error_description: z.string().optional().meta({
			description: "エラーの詳細説明",
		}),
	})
	.meta({ description: "OAuth2/OIDC エラー応答" })

export const ResourceApiErrorResultSchema = z.object({
	message: z.string().meta({
		description: "エラーメッセージ",
	}),
})
