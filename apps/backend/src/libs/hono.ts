import { OpenAPIHono } from "@hono/zod-openapi"
import { HTTPException } from "hono/http-exception"
import type { Env } from "hono/types"
import { ZodError } from "zod"

export const honoApp = <E extends Env>() => {
	return new OpenAPIHono<E>({
		defaultHook: (result) => {
			if (!result.success) {
				if (result.error instanceof ZodError) {
					// `z.parse()`実行時のエラーをHTTPException化して再スロー
					throw new HTTPException(400, {
						message: "Schema parse error",
						cause: result.error,
					})
				}
				throw new HTTPException(500, {
					message: "Unknown validation error",
					cause: result.error,
				})
			}
		},
	})
}
