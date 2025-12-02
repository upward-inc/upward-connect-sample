import { OpenAPIHono } from "@hono/zod-openapi"
import { HTTPException } from "hono/http-exception"
import type { Env } from "hono/types"

export const honoApp = <E extends Env>() => {
	return new OpenAPIHono<E>({
		defaultHook: (result) => {
			if (!result.success) {
				// zodのバリデーションエラーをHTTPExceptionとして再スローする理由：
				// 1. 統一されたエラーハンドリング: アプリケーション全体でHTTPExceptionを使用した一貫したエラー処理を実現
				// 2. 適切なHTTPステータスコード: クライアントに400 Bad Requestとして適切なレスポンスを返す
				// 3. エラー情報の保持: 元のzodエラー情報をcauseプロパティで保持し、デバッグ時に詳細情報を確認可能
				// 4. Honoのミドルウェアチェーンとの統合: HTTPExceptionはHonoのエラーハンドラーで自動的に処理される
				throw new HTTPException(400, {
					message: "Schema parse error",
					cause: result.error,
				})
			}
		},
	})
}
