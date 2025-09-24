import { Hono } from "hono"
import { getRecordList } from "../../domain/record"
import { createRecord } from "../../domain/record/create-record"
import { validateCreateRecordParams } from "../../domain/record/validate-create-record-params"
import { describeRoute, validator } from "../../libs/hono-openapi"
import type { AuthContexts } from "../../schema/auth"
import {
	GetRecordListQuerySchema,
	GetRecordListResponseSchema,
	PostRecordBodySchema,
	PostRecordResponseSchema,
} from "../../schema/record"

export const recordRouter = new Hono<{ Variables: AuthContexts }>()
	.get(
		"/",
		describeRoute({
			description: "レコードの一覧を返却する",
			schema: GetRecordListResponseSchema,
		}),
		validator("query", GetRecordListQuerySchema),
		async (c) => {
			const query = c.req.valid("query")

			const { data, has_next_page, total_size } = await getRecordList(query)

			return c.json({
				has_next_page,
				total_size,
				data,
			})
		},
	)
	.post(
		"/",
		describeRoute({
			description: "レコードを作成する",
			schema: PostRecordResponseSchema,
		}),
		validator("json", PostRecordBodySchema),
		async (c) => {
			const { entity_name, data } = c.req.valid("json")

			const user = c.get("user")

			const validateResult = await validateCreateRecordParams(user.id, {
				entity_name,
				data,
			})
			if (!validateResult.success) {
				return c.json({ message: validateResult.message }, 400)
			}

			const createResult = await createRecord(
				entity_name,
				validateResult.validatedData ?? {},
			)

			return c.json(createResult, 201)
		},
	)
