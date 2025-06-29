import { Scalar } from "@scalar/hono-api-reference"
import { Hono } from "hono"
import { openAPISpecs } from "hono-openapi"
import { cors } from "hono/cors"
import { bearerAuth } from "../../middleware/bearer-auth"
import type { AuthContexts } from "../../schema/auth"
import { authRouter } from "./auth"
import { entityRouter } from "./entity"
import { fileRouter } from "./file"
import { profileRouter } from "./profile"
import { recordRouter } from "./record"
import { roleRouter } from "./role"
import { systemUserRouter } from "./system-user"

const apiRouter = new Hono<{ Variables: AuthContexts }>()

apiRouter
	.use("/*", cors())
	// bearer auth
	.use("/*", async (c, next) => {
		if (
			c.req.path === "/api/openapi" ||
			c.req.path === "/api/docs" ||
			c.req.path.startsWith("/api/auth/")
		) {
			return next()
		}
		return bearerAuth(c, next)
	})
	// generate OpenAPI specification
	.get(
		"/openapi",
		openAPISpecs(apiRouter, {
			documentation: {
				info: {
					title: "Sample API",
					version: "",
					description: "",
				},
				servers: [
					{
						url: `http://localhost:${process.env.PORT}`,
						description: "Local Server",
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
			pageTitle: "Sample API Reference",
			spec: { url: "/api/openapi" },
		}),
	)
	.route("/auth", authRouter)
	.route("/system-users", systemUserRouter)
	.route("/profiles", profileRouter)
	.route("/roles", roleRouter)
	.route("/entities", entityRouter)
	.route("/records", recordRouter)
	.route("/files", fileRouter)

export { apiRouter }
