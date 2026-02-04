import { getEntity } from "../../../../domain/entity"
import {
	createRecord,
	deleteRecord,
	getRecordExists,
	getRecordList,
	updateRecord,
	validateCreateRecordBody,
	validateGetRecordListQuery,
	validateUpdateRecordBody,
} from "../../../../domain/record"
import { createRoute, honoApp } from "../../../../libs/hono"
import type { AuthContexts } from "../../../../schema/auth"
import { ResourceApiErrorResultSchema } from "../../../../schema/error"
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
} from "../../../../schema/record"

export const recordRouter = honoApp<{ Variables: AuthContexts }>()
	.openapi(
		createRoute({
			method: "get",
			path: "/{entity_name}",
			description:
				"パスで指定されたエンティティのレコードを検索し、一覧で返却する",
			request: {
				params: GetRecordParamSchema,
				query: GetRecordListQuerySchema,
			},
			responses: {
				200: {
					description: "Success",
					content: {
						"application/json": { schema: GetRecordListResponseSchema },
					},
				},
				400: {
					description: "Bad Request",
					content: {
						"application/json": { schema: ResourceApiErrorResultSchema },
					},
				},
				404: {
					description: "Entity not found",
					content: {
						"application/json": { schema: ResourceApiErrorResultSchema },
					},
				},
			},
		}),
		async (c) => {
			const { entity_name } = c.req.valid("param")
			const query = c.req.valid("query")

			const entity = await getEntity(entity_name)
			if (!entity) {
				const message = `Entity '${entity_name}' does not exist`
				return c.json({ message }, 404)
			}

			const validateResult = validateGetRecordListQuery(entity, query)
			if (!validateResult.success) {
				return c.json({ message: validateResult.message }, 400)
			}

			const { data, has_next_page, total_size } = await getRecordList(
				entity_name,
				query,
			)

			return c.json(
				{
					has_next_page,
					total_size,
					data,
				},
				200,
			)
		},
	)
	.openapi(
		createRoute({
			method: "post",
			path: "/{entity_name}",
			description:
				"パスで指定されたエンティティに対し、リクエストボディの内容でレコードを作成する",
			request: {
				params: PostRecordParamSchema,
				body: {
					content: {
						"application/json": { schema: PostRecordBodySchema },
					},
				},
			},
			responses: {
				201: {
					description: "Created",
					content: {
						"application/json": { schema: PostRecordResponseSchema },
					},
				},
				400: {
					description: "Bad Request",
					content: {
						"application/json": { schema: ResourceApiErrorResultSchema },
					},
				},
				404: {
					description: "Entity not found",
					content: {
						"application/json": { schema: ResourceApiErrorResultSchema },
					},
				},
			},
		}),
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
	.openapi(
		createRoute({
			method: "patch",
			path: "/{entity_name}/{id}",
			description: "パスで指定されたエンティティのレコードを更新する",
			request: {
				params: PatchRecordParamSchema,
				body: {
					content: {
						"application/json": { schema: PatchRecordBodySchema },
					},
				},
			},
			responses: {
				200: {
					description: "Success",
					content: {
						"application/json": { schema: PatchRecordResponseSchema },
					},
				},
				400: {
					description: "Bad Request",
					content: {
						"application/json": { schema: ResourceApiErrorResultSchema },
					},
				},
				404: {
					description: "Entity or record not found",
					content: {
						"application/json": { schema: ResourceApiErrorResultSchema },
					},
				},
			},
		}),
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

			return c.json(updateResult, 200)
		},
	)
	.openapi(
		createRoute({
			method: "delete",
			path: "/{entity_name}/{id}",
			description: "パスで指定されたエンティティのレコードを削除する",
			request: {
				params: DeleteRecordParamSchema,
			},
			responses: {
				204: {
					description: "No Content",
				},
				404: {
					description: "Entity or record not found",
					content: {
						"application/json": { schema: ResourceApiErrorResultSchema },
					},
				},
			},
		}),
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
