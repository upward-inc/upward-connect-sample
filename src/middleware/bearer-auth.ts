import { env } from "hono/adapter"
import { bearerAuth as honoBearerAuth } from "hono/bearer-auth"
import { createMiddleware } from "hono/factory"

export const bearerAuth = createMiddleware(async (c, next) => {
	const bearer = honoBearerAuth({
		verifyToken: async (token, c) => {
			const { DUMMY_TOKEN } = env<{ DUMMY_TOKEN: string }>(c)
			return token === DUMMY_TOKEN
		},
		invalidTokenMessage: "Invalid token",
		invalidAuthenticationHeaderMessage: "Invalid authentication header",
		noAuthenticationHeaderMessage: "No authentication header",
	})
	return bearer(c, next)
})
