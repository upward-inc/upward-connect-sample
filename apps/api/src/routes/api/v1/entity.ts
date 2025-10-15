import { OpenAPIHono } from "@hono/zod-openapi"
import {
	getEntity,
	getEntityItem,
	getEntityItemList,
	getEntityList,
} from "../../../domain/entity"
import { describeRoute, validator } from "../../../libs/hono-openapi"
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

export const entityRouter = new OpenAPIHono()
	.get(
		"/",
		describeRoute({
			description: "エンティティの情報を一覧で返却する",
			schema: EntityListSchema,
		}),
		async (c) => {
			const result = await getEntityList()
			return c.json(result)
		},
	)
	.get(
		"/:name",
		describeRoute({
			description: "パスで指定された単一のエンティティ情報を返却する",
			schema: EntitySchema,
		}),
		validator("param", GetEntityParamSchema),
		async (c) => {
			const param = c.req.valid("param")
			const result = await getEntity(param.name)
			if (!result) {
				return c.json({ message: "Entity not found" }, 404)
			}
			return c.json(result)
		},
	)
	.get(
		"/:entity_name/items",
		describeRoute({
			description: "エンティティ項目の情報を一覧で返却する",
			schema: EntityItemListSchema,
		}),
		validator("param", GetEntityItemListParamSchema),
		async (c) => {
			const param = c.req.valid("param")
			const result = await getEntityItemList(param.entity_name)
			return c.json(result)
		},
	)
	.get(
		"/:entity_name/items/:name",
		describeRoute({
			description: "パスで指定された単一のエンティティ項目情報を返却する",
			schema: EntityItemSchema,
		}),
		validator("param", GetEntityItemParamSchema),
		async (c) => {
			const param = c.req.valid("param")
			const result = await getEntityItem(param.entity_name, param.name)
			if (!result) {
				return c.json({ message: "Entity not found" }, 404)
			}
			return c.json(result)
		},
	)
