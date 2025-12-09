import { validateGetRecordListQuery } from "../../../../domain/record"
import {
	getSystemUser,
	getSystemUserList,
} from "../../../../domain/system-user"

import { createRoute, honoApp } from "../../../../libs/hono"
import { ResourceApiErrorResultSchema } from "../../../../schema/error"
import {
	GetSystemUserListQuerySchema,
	GetSystemUserListResponseSchema,
	GetSystemUserParamSchema,
	SystemUserSchema,
} from "../../../../schema/system-user"

export const systemUserRouter = honoApp()
	.openapi(
		createRoute({
			method: "get",
			path: "/",
			description: "システムユーザーの情報を一覧で返却する",
			request: {
				query: GetSystemUserListQuerySchema,
			},
			responses: {
				200: {
					description: "Success",
					content: {
						"application/json": { schema: GetSystemUserListResponseSchema },
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
			const query = c.req.valid("query")

			const validateResult = validateGetRecordListQuery("user", query)
			if (!validateResult.success) {
				return c.json({ message: validateResult.message }, 400)
			}

			const { data, has_next_page, total_size } = await getSystemUserList(query)

			return c.json(
				{
					has_next_page,
					total_size,
					data,
				},
				200,
			)
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
