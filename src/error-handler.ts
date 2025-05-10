import type { Context } from "hono"
import { HTTPException } from "hono/http-exception"
import { ZodError } from "zod"

const fallbackMessage = "Something unexpected happened"

export const handleError = async (
	err: Error,
	c: Context,
): Promise<Response> => {
	if (err instanceof ZodError) {
		// `z.parse()`実行時のエラーをHTTPException化して再スロー
		throw new HTTPException(500, {
			message: "Schema parse error",
			cause: err,
		})
	}

	if (err instanceof HTTPException) {
		// 再スローされたZodError or `hono-openapi/zod`が発生させるレスポンスバリデーションエラー
		if (err.cause instanceof ZodError) {
			return c.json(
				{ message: err.message, issues: err.cause.issues },
				{ status: err.status },
			)
		}

		// 上記以外のエラー
		const message =
			err.message || (await err.getResponse().text()) || fallbackMessage
		return c.json({ message }, { status: err.status })
	}

	// 上記以外のエラー
	const message = err.message || fallbackMessage
	return c.json({ message }, { status: 500 })
}

export const handleNotFound = async (c: Context): Promise<Response> => {
	return c.json({ message: "Not found" }, { status: 404 })
}
