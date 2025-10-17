import { OpenAPIHono, createRoute } from "@hono/zod-openapi"
import { getRole, getRoleList } from "../../../domain/role"
import { ApiErrorResultSchema } from "../../../schema/error"
import {
	GetRoleParamSchema,
	RoleListSchema,
	RoleSchema,
} from "../../../schema/role"

export const roleRouter = new OpenAPIHono()
	.openapi(
		createRoute({
			method: "get",
			path: "/",
			description: "ロールの情報を一覧で返却する",
			responses: {
				200: {
					description: "Success",
					content: {
						"application/json": { schema: RoleListSchema },
					},
				},
			},
		}),
		async (c) => {
			const result = await getRoleList()
			return c.json(result, 200)
		},
	)
	.openapi(
		createRoute({
			method: "get",
			path: "/{name}",
			description: "パスで指定された単一のロール情報を返却する",
			request: {
				params: GetRoleParamSchema,
			},
			responses: {
				200: {
					description: "Success",
					content: {
						"application/json": { schema: RoleSchema },
					},
				},
				404: {
					description: "Role not found",
					content: {
						"application/json": { schema: ApiErrorResultSchema },
					},
				},
			},
		}),
		async (c) => {
			const param = c.req.valid("param")
			const result = await getRole(param.name)
			if (!result) {
				return c.json({ message: "Role not found" }, 404)
			}
			return c.json(result, 200)
		},
	)
