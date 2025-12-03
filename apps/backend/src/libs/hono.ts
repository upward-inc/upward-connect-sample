import { OpenAPIHono } from "@hono/zod-openapi"
import { HTTPException } from "hono/http-exception"
import type { Env } from "hono/types"

export const honoApp = <E extends Env>() => {
	return new OpenAPIHono<E>({
		defaultHook: (result) => {
			if (!result.success) {
				// ZodバリデーションエラーをHTTPExceptionに変換して、
				// グローバルエラーハンドラーで統一的にレスポンス構造を整形できるようにする
				throw new HTTPException(400, {
					message: "Schema parse error",
					cause: result.error,
				})
			}
		},
	})
}

export { createRoute } from "@hono/zod-openapi"
