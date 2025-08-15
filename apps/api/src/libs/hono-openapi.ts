import * as honoOpenApi from "hono-openapi"
import * as honoOpenApiZod from "hono-openapi/zod"
import type { ZodType } from "zod"

export const describeRoute = <S extends ZodType>(options: {
	description: string
	schema: S
}) => {
	const { description, schema } = options
	return honoOpenApi.describeRoute({
		description,
		validateResponse: true,
		responses: {
			200: {
				description: "Success",
				content: {
					"application/json": {
						schema: honoOpenApiZod.resolver(schema),
					},
				},
			},
		},
	})
}

export const describeRouteWithoutResponseValidation = (options: {
	description: string
}) => {
	const { description } = options
	return honoOpenApi.describeRoute({
		description,
		validateResponse: false,
		responses: {
			200: {
				description: "Success",
			},
		},
	})
}

export const validator = honoOpenApiZod.validator
