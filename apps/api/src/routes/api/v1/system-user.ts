import { Hono } from "hono"
import { getSystemUser, getSystemUserList } from "../../../domain/system-user"
import { describeRoute, validator } from "../../../libs/hono-openapi"
import {
	GetSystemUserParamSchema,
	SystemUserListSchema,
	SystemUserSchema,
} from "../../../schema/system-user"

export const systemUserRouter = new Hono()
	.get(
		"/",
		describeRoute({
			description: "システムユーザーの一覧を返却する",
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
			description: "単一のシステムユーザーを返却する",
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
