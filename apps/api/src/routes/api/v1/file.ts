import { Hono } from "hono"
import { createFile, getFile } from "../../../domain/file"
import { describeRoute, validator } from "../../../libs/hono-openapi"
import type { AuthContexts } from "../../../schema/auth"
import {
	GetFileParamSchema,
	PostFileFormSchema,
	PostFileResultSchema,
} from "../../../schema/file"

export const fileRouter = new Hono<{ Variables: AuthContexts }>()
	.get(
		"/:id",
		// Response は json ではないので schema validation は行わない
		describeRoute({
			description: "単一のファイルを返却する",
		}),
		validator("param", GetFileParamSchema),
		async (c) => {
			const param = c.req.valid("param")

			const file = await getFile(param.id)

			if (!file) {
				return c.json({ message: "File not found" }, 404)
			}

			return new Response(file.content, {
				headers: {
					"Content-Type": file.type,
					"Content-Length": file.content.length.toString(),
					"Content-Disposition": "inline",
				},
			})
		},
	)
	.post(
		"/",
		describeRoute({
			description: "ファイルを投稿する",
			schema: PostFileResultSchema,
		}),
		validator("form", PostFileFormSchema),
		async (c) => {
			const formData = await c.req.formData()
			const file = formData.get("file")
			if (!file || !(file instanceof File)) {
				return c.json({ message: "No file uploaded" }, 400)
			}

			const user = c.get("user")
			if (!user) {
				throw new Error("User not found")
			}

			const id = await createFile(file, user.id)

			return c.json({ id })
		},
	)
