import { Hono } from "hono"
import { getRecordList } from "../../domain/record"
import { describeRoute, validator } from "../../libs/hono-openapi"
import {
	GetRecordListQuerySchema,
	GetRecordListResponseSchema,
} from "../../schema/record"

export const recordRouter = new Hono().get(
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
