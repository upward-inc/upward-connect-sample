import { OpenAPIHono } from "@hono/zod-openapi"
import { getProfile, getProfileList } from "../../../domain/profile"
import { describeRoute, validator } from "../../../libs/hono-openapi"
import {
	GetProfileParamSchema,
	ProfileListSchema,
	ProfileSchema,
} from "../../../schema/profile"

export const profileRouter = new OpenAPIHono()
	.get(
		"/",
		describeRoute({
			description: "プロファイルの情報を一覧で返却する",
			schema: ProfileListSchema,
		}),
		async (c) => {
			const result = await getProfileList()
			return c.json(result)
		},
	)
	.get(
		"/:name",
		describeRoute({
			description: "パスで指定された単一のプロファイル情報を返却する",
			schema: ProfileSchema,
		}),
		validator("param", GetProfileParamSchema),
		async (c) => {
			const param = c.req.valid("param")
			const result = await getProfile(param.name)
			if (!result) {
				return c.json({ message: "Profile not found" }, 404)
			}
			return c.json(result)
		},
	)
