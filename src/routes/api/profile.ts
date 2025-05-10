import { Hono } from "hono"
import { getProfile, getProfileList } from "../../domain/profile"
import { describeRoute, validator } from "../../libs/hono-openapi"
import {
	GetProfileParamSchema,
	ProfileListSchema,
	ProfileSchema,
} from "../../schema/profile"

export const profileRouter = new Hono()
	.get(
		"/",
		describeRoute({
			description: "プロファイルの一覧を返却する",
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
			description: "単一のプロファイルを返却する",
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
