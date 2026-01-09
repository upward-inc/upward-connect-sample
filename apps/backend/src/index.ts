import { secureHeaders } from "hono/secure-headers"
import { trimTrailingSlash } from "hono/trailing-slash"
import { configuration } from "./configuration"
import { handleError, handleNotFound } from "./error-handler"
import { honoApp } from "./libs/hono"
import { router } from "./routes"

export const app = honoApp()

// middleware
app.use(secureHeaders())
// app.use(compress()) // APIドキュメントが表示されないためコメントアウト
app.use(trimTrailingSlash())

// routing
app.route("/", router)

// handle error
app.onError(handleError)
app.notFound(handleNotFound)

export default {
	port: configuration.PORT,
	fetch: app.fetch,
}
