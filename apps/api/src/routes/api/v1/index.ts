import { Scalar } from "@scalar/hono-api-reference"
import { Hono } from "hono"
import { openAPISpecs } from "hono-openapi"
import { cors } from "hono/cors"
import { bearerAuth } from "../../../middleware/bearer-auth"
import type { AuthContexts } from "../../../schema/auth"
import { authRouter } from "./auth"
import { entityRouter } from "./entity"
import { fileRouter } from "./file"
import { profileRouter } from "./profile"
import { recordRouter } from "./record"
import { roleRouter } from "./role"
import { systemUserRouter } from "./system-user"

const v1Router = new Hono<{ Variables: AuthContexts }>()
const version = "v1" as const

v1Router
	.use("/*", cors())
	// bearer auth
	.use("/*", async (c, next) => {
		const normalizedPath = c.req.path.replace(/\/$/, "")
		const publicPaths = [
			`/api/${version}/openapi`,
			`/api/${version}/docs`,
			`/api/${version}/oauth2/login`,
			`/api/${version}/oauth2/token`,
		]

		if (publicPaths.includes(normalizedPath)) {
			return next()
		}
		return bearerAuth(c, next)
	})
	// generate OpenAPI specification
	.get(
		"/openapi",
		openAPISpecs(v1Router, {
			documentation: {
				info: {
					title: "Custom API for UPWARD CONNECT",
					version: version,
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
			pageTitle: "API Doc | Custom API for UPWARD CONNECT",
			spec: { url: `/api/${version}/openapi` },
		}),
	)
	.route("/oauth2", authRouter)
	.route("/system-users", systemUserRouter)
	.route("/profiles", profileRouter)
	.route("/roles", roleRouter)
	.route("/entities", entityRouter)
	.route("/records", recordRouter)
	.route("/files", fileRouter)

export { v1Router }
