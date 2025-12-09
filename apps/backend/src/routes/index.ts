import { cors } from "hono/cors"
import { honoApp } from "../libs/hono"
import { bearerAuth } from "../middleware/bearer-auth"
import type { AuthContexts } from "../schema/auth"
import { wellKnownRouter } from "./.well-known"
import { apiRouter } from "./api"
import { internalAuthRouter } from "./internal-auth"
import { oauth2Router } from "./oauth2"
import { setupOpenAPIEndpoints } from "./utils/openapi-setup"

const noneVersioningRouter = honoApp()
	.route("/.well-known", wellKnownRouter)
	.route("/oauth2", oauth2Router)
	.route("/auth", internalAuthRouter)

setupOpenAPIEndpoints(noneVersioningRouter, "/", {
	pageTitle: "AuthN/AuthZ API",
	version: "",
	description: "認証・認可APIドキュメント",
})

export const router = honoApp<{ Variables: AuthContexts }>()
	.use("/*", cors())
	// bearer auth
	.use("/*", async (c, next) => {
		// ユーザー認証を必要としないパス一覧
		const publicPaths = [
			"/openapi",
			"/docs",
			"/api/v1/openapi",
			"/api/v1/docs",
			"/.well-known/openid-configuration",
			"/auth/login",
			"/oauth2/token",
			"/oauth2/jwks",
		]

		const normalizedPath = c.req.path.replace(/\/$/, "")

		if (publicPaths.includes(normalizedPath)) {
			return next()
		}
		return bearerAuth(c, next)
	})
	.route("/api", apiRouter)
	.route("/", noneVersioningRouter)
