import { bearerAuth as honoBearerAuth } from "hono/bearer-auth"
import { createMiddleware } from "hono/factory"
import { verify } from "jsonwebtoken"
import { env } from "../env"
import type { AuthContexts } from "../schema/auth"

export const bearerAuth = createMiddleware<{
	Variables: AuthContexts
}>(async (c, next) => {
	const bearer = honoBearerAuth({
		verifyToken: async (token, c) => {
			try {
				// トークンの検証
				const result = verify(token, env.OIDC_TOKEN_SECRET)
				if (!(typeof result.sub === "string" && result.sub.length > 0)) {
					return false
				}

				const userContext: AuthContexts["user"] = { id: result.sub }

				// ユーザー情報をコンテキストに保存
				c.set("user", userContext)

				return true
			} catch {
				return false
			}
		},
		invalidTokenMessage: "Invalid token",
		invalidAuthenticationHeaderMessage: "Invalid authentication header",
		noAuthenticationHeaderMessage: "No authentication header",
	})
	return bearer(c, next)
})
