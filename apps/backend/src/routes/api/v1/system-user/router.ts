import { OpenAPIHono, createRoute } from "@hono/zod-openapi"
import { getSystemUser, getSystemUserList } from "../../../../domain/system-user"
import { ResourceApiErrorResultSchema } from "../../../../schema/error"
import {
	GetSystemUserParamSchema,
	SystemUserListSchema,
	SystemUserSchema,
} from "../../../../schema/system-user"

export const systemUserRouter = new OpenAPIHono()
	.openapi(
		createRoute({
			method: "get",
			path: "/",
			description: "システムユーザーの情報を一覧で返却する",
			responses: {
				200: {
					description: "Success",
					content: {
						"application/json": { schema: SystemUserListSchema },
					},
				},
			},
		}),
		async (c) => {
			const result = await getSystemUserList()
			return c.json(result, 200)
		},
	)
	.openapi(
		createRoute({
			method: "get",
			path: "/{id}",
			description: "パスで指定された単一のシステムユーザー情報を返却する",
			request: {
				params: GetSystemUserParamSchema,
			},
			responses: {
				200: {
					description: "Success",
					content: {
						"application/json": { schema: SystemUserSchema },
					},
				},
				404: {
					description: "System user not found",
					content: {
						"application/json": { schema: ResourceApiErrorResultSchema },
					},
				},
			},
		}),
		async (c) => {
			const param = c.req.valid("param")
			const result = await getSystemUser(param.id)
			if (!result) {
				return c.json({ message: "System user not found" }, 404)
			}
			return c.json(result, 200)
		},
	)
