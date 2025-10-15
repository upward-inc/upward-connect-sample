import { OpenAPIHono } from "@hono/zod-openapi"
import { setupOpenAPIEndpoints } from "../../utils/openapi-setup"
import { configurationRouter } from "./configuration"
import { entityRouter } from "./entity"
import { fileRouter } from "./file"
import { profileRouter } from "./profile"
import { recordRouter } from "./record"
import { roleRouter } from "./role"
import { systemUserRouter } from "./system-user"

const v1Router = new OpenAPIHono()
	.route("/system-users", systemUserRouter)
	.route("/profiles", profileRouter)
	.route("/roles", roleRouter)
	.route("/entities", entityRouter)
	.route("/records", recordRouter)
	.route("/files", fileRouter)
	.route("/configuration", configurationRouter)

setupOpenAPIEndpoints(v1Router, "/api/v1", {
	pageTitle: "Resource API v1",
	version: "v1",
	description: "リソースAPIドキュメント v1",
})

export { v1Router }
