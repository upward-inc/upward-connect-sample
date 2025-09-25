import { Hono } from "hono"
import { getEntity } from "../../../domain/entity/get-entity"
import {
	createRecord,
	getRecordList,
	validateCreateRecordParams,
} from "../../../domain/record"
import { describeRoute, validator } from "../../../libs/hono-openapi"
import type { AuthContexts } from "../../../schema/auth"
import {
	GetRecordListQuerySchema,
	GetRecordListResponseSchema,
	PostRecordBodySchema,
	PostRecordParamSchema,
	PostRecordResponseSchema,
} from "../../../schema/record"

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

			const entity = await getEntity(query.entity_name)
			if (!entity) {
				return c.json(
					{ message: `Entity '${query.entity_name}' does not exist` },
					400,
				)
			}

			const { data, has_next_page, total_size } = await getRecordList(query)

			return c.json({
				has_next_page,
				total_size,
				data,
			})
		},
	)
	.post(
		"/:entity_name",
		describeRoute({
			description: "レコードを作成する",
			schema: PostRecordResponseSchema,
		}),
		validator("param", PostRecordParamSchema),
		validator("json", PostRecordBodySchema),
		async (c) => {
			const { entity_name } = c.req.valid("param")
			const data = c.req.valid("json")

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
