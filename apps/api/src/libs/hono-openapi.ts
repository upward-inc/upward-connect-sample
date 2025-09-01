import * as honoOpenApi from "hono-openapi"
import * as honoOpenApiZod from "hono-openapi/zod"
import type { ZodType } from "zod"

export const describeRoute = <S extends ZodType>(options: {
	description: string
	schema?: S
}) => {
	const { description, schema } = options
	// schema がある場合は、レスポンスの validation を行う
	const content = schema
		? {
				"application/json": {
					schema: honoOpenApiZod.resolver(schema),
				},
			}
		: undefined
	return honoOpenApi.describeRoute({
		description,
		validateResponse: !!schema,
		responses: {
			200: {
				description: "Success",
				content: content,
			},
		},
	})
}

export const validator = honoOpenApiZod.validator
