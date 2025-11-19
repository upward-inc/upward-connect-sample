import { OpenAPIHono } from "@hono/zod-openapi"
import { cors } from "hono/cors"
import { configuration } from "../configuration"
import { bearerAuth } from "../middleware/bearer-auth"
import type { AuthContexts } from "../schema/auth"
import { wellKnownRouter } from "./.well-known"
import { apiRouter } from "./api"
import { internalAuthRouter } from "./internal-auth"
import { oauth2Router } from "./oauth2"
import { setupOpenAPIEndpoints } from "./utils/openapi-setup"

const noneVersioningRouter = new OpenAPIHono()
	.route("/.well-known", wellKnownRouter)
	.route("/oauth2", oauth2Router)
	.route("/auth", internalAuthRouter)

setupOpenAPIEndpoints(noneVersioningRouter, "/", {
	pageTitle: "AuthN/AuthZ API",
	version: "",
	description: "認証・認可APIドキュメント",
})

export const router = new OpenAPIHono<{ Variables: AuthContexts }>()
	.use(
		"/*",
		cors({
			origin: configuration.FRONTEND_URL,
			credentials: true,
		}),
	)
	// bearer auth
	.use("/*", async (c, next) => {
		// ユーザー認証を必要としないパス一覧
		const publicPaths = [
			"/openapi",
			"/docs",
			"/api/v1/openapi",
			"/api/v1/docs",
			"/.well-known/openid-configuration",
			"/oauth2/token",
			"/oauth2/jwks",
			"/auth/*",
		]

		const normalizedPath = c.req.path.replace(/\/$/, "")

		// パブリックパスの場合は認証をスキップ
		const isPublicPath = publicPaths.some((path) =>
			path.includes("*")
				? new RegExp(`^${path.replace(/\*/g, ".*")}$`).test(normalizedPath)
				: path === normalizedPath,
		)
		if (isPublicPath) {
			return next()
		}
		return bearerAuth(c, next)
	})
	.route("/api", apiRouter)
	.route("/", noneVersioningRouter)
