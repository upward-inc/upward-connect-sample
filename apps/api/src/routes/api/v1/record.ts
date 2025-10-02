import { Hono } from "hono"
import { getEntity } from "../../../domain/entity"
import {
	createRecord,
	deleteRecord,
	getRecordList,
	validateCreateRecordParams,
} from "../../../domain/record"
import { describeRoute, validator } from "../../../libs/hono-openapi"
import type { AuthContexts } from "../../../schema/auth"
import {
	DeleteRecordParamSchema,
	GetRecordListQuerySchema,
	GetRecordListResponseSchema,
	GetRecordParamSchema,
	PostRecordBodySchema,
	PostRecordParamSchema,
	PostRecordResponseSchema,
} from "../../../schema/record"

export const recordRouter = new Hono<{ Variables: AuthContexts }>()
	.get(
		"/:entity_name",
		describeRoute({
			description: "レコードの一覧を返却する",
			schema: GetRecordListResponseSchema,
		}),
		validator("param", GetRecordParamSchema),
		validator("query", GetRecordListQuerySchema),
		async (c) => {
			const { entity_name } = c.req.valid("param")
			const query = c.req.valid("query")

			const entity = await getEntity(entity_name)
			if (!entity) {
				return c.json(
					{ message: `Entity '${entity_name}' does not exist` },
					400,
				)
			}

			const { data, has_next_page, total_size } = await getRecordList(
				entity_name,
				query,
			)

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
	.delete(
		"/:entity_name/:id",
		describeRoute({
			description: "レコードを削除する",
		}),
		validator("param", DeleteRecordParamSchema),
		async (c) => {
			const { entity_name, id } = c.req.valid("param")

			const entity = await getEntity(entity_name)
			if (!entity) {
				return c.json(
					{ message: `エンティティ '${entity_name}' は存在しません` },
					404,
				)
			}

			const deleted = await deleteRecord(entity_name, id)
			if (!deleted) {
				return c.json(
					{ message: `ID '${id}' のレコードは '${entity_name}' に存在しません` },
					404,
				)
			}

			return c.body(null, 204)
		},
	)
