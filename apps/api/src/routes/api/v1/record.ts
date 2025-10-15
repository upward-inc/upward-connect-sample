import { OpenAPIHono } from "@hono/zod-openapi"
import { getEntity } from "../../../domain/entity"
import {
	createRecord,
	deleteRecord,
	getRecordExists,
	getRecordList,
	updateRecord,
	validateCreateRecordBody,
	validateGetRecordListQuery,
	validateUpdateRecordBody,
} from "../../../domain/record"
import { describeRoute, validator } from "../../../libs/hono-openapi"
import type { AuthContexts } from "../../../schema/auth"
import { NestableAndFilterSchema } from "../../../schema/filter"
import {
	DeleteRecordParamSchema,
	GetRecordListQuerySchema,
	GetRecordListResponseSchema,
	GetRecordParamSchema,
	PatchRecordBodySchema,
	PatchRecordParamSchema,
	PatchRecordResponseSchema,
	PostRecordBodySchema,
	PostRecordParamSchema,
	PostRecordResponseSchema,
} from "../../../schema/record"

export const recordRouter = new OpenAPIHono<{ Variables: AuthContexts }>()
	.get(
		"/:entity_name",
		describeRoute({
			description:
				"パスで指定されたエンティティのレコードを検索し、一覧で返却する",
			schema: GetRecordListResponseSchema,
		}),
		validator("param", GetRecordParamSchema),
		validator("query", GetRecordListQuerySchema),
		async (c) => {
			const { entity_name } = c.req.valid("param")
			const query = c.req.valid("query")

			const entity = await getEntity(entity_name)
			if (!entity) {
				const message = `Entity '${entity_name}' does not exist`
				return c.json({ message }, 404)
			}

			const validateResult = validateGetRecordListQuery(query)
			if (!validateResult.success) {
				return c.json({ message: validateResult.message }, 400)
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
			description:
				"パスで指定されたエンティティに対し、リクエストボディの内容でレコードを作成する",
			schema: PostRecordResponseSchema,
		}),
		validator("param", PostRecordParamSchema),
		validator("json", PostRecordBodySchema),
		async (c) => {
			const user = c.get("user")
			const { entity_name } = c.req.valid("param")
			const data = c.req.valid("json")

			// エンティティが存在しない場合はエラー
			const entity = await getEntity(entity_name)
			if (!entity) {
				const message = `Entity '${entity_name}' does not exist`
				return c.json({ message }, 404)
			}

			// ボディデータのバリデーション
			const validateResult = await validateCreateRecordBody(entity_name, data)
			if (!validateResult.success) {
				return c.json({ message: validateResult.message }, 400)
			}

			const createResult = await createRecord(
				user.id,
				entity_name,
				validateResult.fields,
			)

			return c.json(createResult, 201)
		},
	)
	.patch(
		"/:entity_name/:id",
		describeRoute({
			description: "パスで指定されたエンティティのレコードを更新する",
			schema: PatchRecordResponseSchema,
		}),
		validator("param", PatchRecordParamSchema),
		validator("json", PatchRecordBodySchema),
		async (c) => {
			const user = c.get("user")
			const { entity_name, id } = c.req.valid("param")
			const data = c.req.valid("json")

			// エンティティが存在しない場合はエラー
			const entity = await getEntity(entity_name)
			if (!entity) {
				const message = `Entity '${entity_name}' does not exist`
				return c.json({ message }, 404)
			}

			// 更新対象のレコードが存在しない場合はエラー
			const isRecordExists = await getRecordExists(entity_name, id)
			if (!isRecordExists) {
				const message = `Record with ID '${id}' does not exist in '${entity_name}'`
				return c.json({ message }, 404)
			}

			// ボディデータのバリデーション
			const validateResult = await validateUpdateRecordBody(entity_name, data)
			if (!validateResult.success) {
				return c.json({ message: validateResult.message }, 400)
			}

			const updateResult = await updateRecord(
				user.id,
				id,
				entity_name,
				validateResult.fields,
			)

			return c.json(updateResult)
		},
	)
	.delete(
		"/:entity_name/:id",
		describeRoute({
			description: "パスで指定されたエンティティのレコードを削除する",
		}),
		validator("param", DeleteRecordParamSchema),
		async (c) => {
			const { entity_name, id } = c.req.valid("param")

			const entity = await getEntity(entity_name)
			if (!entity) {
				const message = `Entity '${entity_name}' does not exist`
				return c.json({ message }, 404)
			}

			const { deleted } = await deleteRecord(entity_name, id)
			if (!deleted) {
				const message = `Record with ID '${id}' does not exist in '${entity_name}'`
				return c.json({ message }, 404)
			}

			return c.body(null, 204)
		},
	)
