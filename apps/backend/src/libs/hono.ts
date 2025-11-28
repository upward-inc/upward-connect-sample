import { OpenAPIHono } from "@hono/zod-openapi"
import { HTTPException } from "hono/http-exception"
import type { Env } from "hono/types"

export const honoApp = <E extends Env>() => {
	return new OpenAPIHono<E>({
		defaultHook: (result) => {
			if (!result.success) {
				// `z.parse()`実行時のエラーをHTTPException化して再スロー
				throw new HTTPException(400, {
					message: "Schema parse error",
					cause: result.error,
				})
			}
		},
	})
}
