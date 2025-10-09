import { Scalar } from "@scalar/hono-api-reference"
import { Hono } from "hono"
import { openAPISpecs } from "hono-openapi"
import { cors } from "hono/cors"
import { env } from "../env"
import { bearerAuth } from "../middleware/bearer-auth"
import type { AuthContexts } from "../schema/auth"
import { wellKnownRouter } from "./.well-known"
import { apiRouter } from "./api"
import { internalAuthRouter } from "./internal-auth"
import { oauth2Router } from "./oauth2"

const currentVersion = "v1" as const
const documentTitle = "Custom API for UPWARD CONNECT" as const

const router = new Hono<{ Variables: AuthContexts }>()

router
	.use("/*", cors())
	// bearer auth
	.use("/*", async (c, next) => {
		// ユーザー認証を必要としないパス一覧
		const publicPaths = [
			"/openapi",
			"/docs",
			"/.well-known/openid-configuration",
			"/auth/login",
			"/oauth2/token",
		]

		const normalizedPath = c.req.path.replace(/\/$/, "")

		if (publicPaths.includes(normalizedPath)) {
			return next()
		}
		return bearerAuth(c, next)
	})
	// generate OpenAPI specification
	.get(
		"/openapi",
		openAPISpecs(router, {
			excludeStaticFile: false,
			documentation: {
				info: {
					title: documentTitle,
					version: currentVersion,
					description: "",
				},
				servers: [
					{
						url: "http://localhost:{port}",
						description: "Local Server",
						variables: {
							port: {
								default: env.PORT.toString(),
							},
						},
					},
				],
			},
		}),
	)
	// serve API documentation
	.get(
		"/docs",
		Scalar({
			theme: "saturn",
			pageTitle: `API Doc | ${documentTitle}`,
			spec: { url: "/openapi" },
		}),
	)
	.route("/.well-known", wellKnownRouter)
	.route("/oauth2", oauth2Router)
	.route("/auth", internalAuthRouter)
	.route("/api", apiRouter)

export { router }
