import { Hono } from "hono"
import { getRecordList } from "../../domain/record"
import { createRecord } from "../../domain/record/create-record"
import { describeRoute, validator } from "../../libs/hono-openapi"
import type { AuthContexts } from "../../schema/auth"
import {
	CreateRecordMutationSchema,
	CreateRecordResponseSchema,
	GetRecordListQuerySchema,
	GetRecordListResponseSchema,
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
			description: "レコードを一件作成する",
			schema: CreateRecordResponseSchema,
		}),
		validator("json", CreateRecordMutationSchema),
		async (c) => {
			const { entity_name, data } = c.req.valid("json")

			const user = c.get("user")

			const result = await createRecord(user.id, {
				entity_name,
				data: data,
			})

			return c.json(result, 201)
		},
	)
