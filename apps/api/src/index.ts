import { Hono } from "hono"
import { secureHeaders } from "hono/secure-headers"
import { trimTrailingSlash } from "hono/trailing-slash"
import { env } from "./env"
import { handleError, handleNotFound } from "./error-handler"
import { apiRouter } from "./routes/api"
import { wellKnownRouter } from "./routes/well-known"

export const app = new Hono()

// middleware
app.use(secureHeaders())
// app.use(compress()) // APIドキュメントが表示されないためコメントアウト
app.use(trimTrailingSlash())

// routing
app.route("/api", apiRouter)
app.route("/.well-known", wellKnownRouter)

// handle error
app.onError(handleError)
app.notFound(handleNotFound)

export default {
	port: env.PORT,
	fetch: app.fetch,
}
