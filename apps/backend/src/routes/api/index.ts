import { honoApp } from "../../libs/hono"
import { v1Router } from "./v1"

export const apiRouter = honoApp().route("/v1", v1Router)
