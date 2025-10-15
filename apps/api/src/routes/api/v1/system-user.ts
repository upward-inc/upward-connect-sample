import { OpenAPIHono } from "@hono/zod-openapi"
import { getSystemUser, getSystemUserList } from "../../../domain/system-user"
import { describeRoute, validator } from "../../../libs/hono-openapi"
import {
	GetSystemUserParamSchema,
	SystemUserListSchema,
	SystemUserSchema,
} from "../../../schema/system-user"

export const systemUserRouter = new OpenAPIHono()
	.get(
		"/",
		describeRoute({
			description: "システムユーザーの情報を一覧で返却する",
			schema: SystemUserListSchema,
		}),
		async (c) => {
			const result = await getSystemUserList()
			return c.json(result)
		},
	)
	.get(
		"/:id",
		describeRoute({
			description: "パスで指定された単一のシステムユーザー情報を返却する",
			schema: SystemUserSchema,
		}),
		validator("param", GetSystemUserParamSchema),
		async (c) => {
			const param = c.req.valid("param")
			const result = await getSystemUser(param.id)
			if (!result) {
				return c.json({ message: "System user not found" }, 404)
			}
			return c.json(result)
		},
	)
