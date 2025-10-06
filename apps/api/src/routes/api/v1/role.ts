import { Hono } from "hono"
import { getRole, getRoleList } from "../../../domain/role"
import { describeRoute, validator } from "../../../libs/hono-openapi"
import {
	GetRoleParamSchema,
	RoleListSchema,
	RoleSchema,
} from "../../../schema/role"

export const roleRouter = new Hono()
	.get(
		"/",
		describeRoute({
			description: "ロールの情報を一覧で返却する",
			schema: RoleListSchema,
		}),
		async (c) => {
			const result = await getRoleList()
			return c.json(result)
		},
	)
	.get(
		"/:name",
		describeRoute({
			description: "パスで指定された単一のロール情報を返却する",
			schema: RoleSchema,
		}),
		validator("param", GetRoleParamSchema),
		async (c) => {
			const param = c.req.valid("param")
			const result = await getRole(param.name)
			if (!result) {
				return c.json({ message: "Role not found" }, 404)
			}
			return c.json(result)
		},
	)
