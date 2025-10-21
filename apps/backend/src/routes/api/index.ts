import { OpenAPIHono } from "@hono/zod-openapi"
import { v1Router } from "./v1"

export const apiRouter = new OpenAPIHono().route("/v1", v1Router)
