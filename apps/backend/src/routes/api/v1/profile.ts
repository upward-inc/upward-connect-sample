import { getProfile, getProfileList } from "../../../domain/profile"
import { createRoute, honoApp } from "../../../libs/hono"
import { ResourceApiErrorResultSchema } from "../../../schema/error"
import {
	GetProfileParamSchema,
	ProfileListSchema,
	ProfileSchema,
} from "../../../schema/profile"

export const profileRouter = honoApp()
	.openapi(
		createRoute({
			method: "get",
			path: "/",
			description: "プロファイルの情報を一覧で返却する",
			responses: {
				200: {
					description: "Success",
					content: {
						"application/json": { schema: ProfileListSchema },
					},
				},
			},
		}),
		async (c) => {
			const result = await getProfileList()
			return c.json(result, 200)
		},
	)
	.openapi(
		createRoute({
			method: "get",
			path: "/{name}",
			description: "パスで指定された単一のプロファイル情報を返却する",
			request: {
				params: GetProfileParamSchema,
			},
			responses: {
				200: {
					description: "Success",
					content: {
						"application/json": { schema: ProfileSchema },
					},
				},
				404: {
					description: "Profile not found",
					content: {
						"application/json": { schema: ResourceApiErrorResultSchema },
					},
				},
			},
		}),
		async (c) => {
			const param = c.req.valid("param")
			const result = await getProfile(param.name)
			if (!result) {
				return c.json({ message: "Profile not found" }, 404)
			}
			return c.json(result, 200)
		},
	)
