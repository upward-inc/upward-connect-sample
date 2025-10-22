import type { HttpHandler } from "msw"
import { setupServer } from "msw/node"

export const server = setupServer()

export const setRequestHandlers = (...handlers: HttpHandler[]) => {
	server.resetHandlers()
	server.use(...handlers)
}
