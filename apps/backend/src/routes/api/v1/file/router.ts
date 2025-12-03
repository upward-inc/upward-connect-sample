import { createFile, getFile } from "../../../../domain/file"
import { createRoute, honoApp } from "../../../../libs/hono"
import type { AuthContexts } from "../../../../schema/auth"
import { ResourceApiErrorResultSchema } from "../../../../schema/error"
import {
	GetFileParamSchema,
	PostFileFormSchema,
	PostFileResultSchema,
} from "../../../../schema/file"

export const fileRouter = honoApp<{ Variables: AuthContexts }>()
	.openapi(
		createRoute({
			method: "get",
			path: "/{id}",
			description: "パスで指定されたIDのファイルを返却する",
			request: {
				params: GetFileParamSchema,
			},
			responses: {
				200: {
					description: "Success",
					// 返却対象ファイルのコンテンツタイプは動的に変わるため、OpenAPIの仕様上 schema は指定しない
				},
				404: {
					description: "File not found",
					content: {
						"application/json": { schema: ResourceApiErrorResultSchema },
					},
				},
			},
		}),
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
				status: 200,
			})
		},
	)
	.openapi(
		createRoute({
			method: "post",
			path: "/",
			description: "送信されたファイルを保存する",
			request: {
				body: {
					content: {
						"multipart/form-data": { schema: PostFileFormSchema },
					},
				},
			},
			responses: {
				200: {
					description: "Success",
					content: {
						"application/json": { schema: PostFileResultSchema },
					},
				},
				400: {
					description: "Bad Request",
					content: {
						"application/json": { schema: ResourceApiErrorResultSchema },
					},
				},
			},
		}),
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

			return c.json({ id }, 200)
		},
	)
