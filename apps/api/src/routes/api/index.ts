import { Hono } from "hono"
import { v1Router } from "./v1"

export const apiRouter = new Hono().route("/v1", v1Router)
