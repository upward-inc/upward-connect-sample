import { Hono } from "hono"
import { createFile, getFile } from "../../domain/file"
import { describeRoute, validator } from "../../libs/hono-openapi"
import { prisma } from "../../libs/prisma"
import {
	FileSchema,
	GetFileParamSchema,
	PostFileFormSchema,
	PostFileResultSchema,
} from "../../schema/file"

export const fileRouter = new Hono()
	.get(
		"/:id",
		describeRoute({
			description: "単一のファイルを返却する",
			schema: FileSchema,
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

			// TODO: 認証機能を実装したらAPIリクエストユーザーに置き換える
			const user = await prisma.user.findFirst()
			if (!user) {
				throw new Error("User not found")
			}

			const id = await createFile(file, user.id)

			return c.json({ id })
		},
	)
