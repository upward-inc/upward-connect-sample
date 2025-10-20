import { OpenAPIHono, createRoute } from "@hono/zod-openapi"
import {
	getEntity,
	getEntityItem,
	getEntityItemList,
	getEntityList,
} from "../../../domain/entity"
import {
	EntityListSchema,
	EntitySchema,
	GetEntityParamSchema,
} from "../../../schema/entity"
import {
	EntityItemListSchema,
	EntityItemSchema,
	GetEntityItemListParamSchema,
	GetEntityItemParamSchema,
} from "../../../schema/entity-item"
import { ResourceApiErrorResultSchema } from "../../../schema/error"

export const entityRouter = new OpenAPIHono()
	.openapi(
		createRoute({
			method: "get",
			path: "/",
			description: "エンティティの情報を一覧で返却する",
			responses: {
				200: {
					description: "Success",
					content: {
						"application/json": { schema: EntityListSchema },
					},
				},
			},
		}),
		async (c) => {
			const result = await getEntityList()
			return c.json(result, 200)
		},
	)
	.openapi(
		createRoute({
			method: "get",
			path: "/{name}",
			description: "パスで指定された単一のエンティティ情報を返却する",
			request: {
				params: GetEntityParamSchema,
			},
			responses: {
				200: {
					description: "Success",
					content: {
						"application/json": { schema: EntitySchema },
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
			const param = c.req.valid("param")
			const result = await getEntity(param.name)
			if (!result) {
				return c.json({ message: "Entity not found" }, 404)
			}
			return c.json(result, 200)
		},
	)
	.openapi(
		createRoute({
			method: "get",
			path: "/{entity_name}/items",
			description: "エンティティ項目の情報を一覧で返却する",
			request: {
				params: GetEntityItemListParamSchema,
			},
			responses: {
				200: {
					description: "Success",
					content: { "application/json": { schema: EntityItemListSchema } },
				},
			},
		}),
		async (c) => {
			const param = c.req.valid("param")
			const result = await getEntityItemList(param.entity_name)
			return c.json(result, 200)
		},
	)
	.openapi(
		createRoute({
			method: "get",
			path: "/{entity_name}/items/{name}",
			description: "パスで指定された単一のエンティティ項目情報を返却する",
			request: {
				params: GetEntityItemParamSchema,
			},
			responses: {
				200: {
					description: "Success",
					content: {
						"application/json": { schema: EntityItemSchema },
					},
				},
				404: {
					description: "Entity Item not found",
					content: {
						"application/json": { schema: ResourceApiErrorResultSchema },
					},
				},
			},
		}),
		async (c) => {
			const param = c.req.valid("param")
			const result = await getEntityItem(param.entity_name, param.name)
			if (!result) {
				return c.json({ message: "Entity not found" }, 404)
			}
			return c.json(result, 200)
		},
	)
