import type { Hono } from "hono"
import * as honoOpenApi from "hono-openapi"
import * as honoOpenApiZod from "hono-openapi/zod"
import type { ZodType } from "zod"
import { env } from "../env"

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

export const generateOpenAPISpecs = (
	router: Hono,
	{
		version,
		description,
	}: {
		version: string
		description?: string
	},
) => {
	return honoOpenApi.openAPISpecs(router, {
		excludeStaticFile: false,
		documentation: {
			info: {
				title: env.APP_NAME,
				version,
				description,
			},
			servers: [
				{
					url: "http://localhost:{port}",
					description: "Local Server",
					variables: {
						port: {
							default: env.PORT.toString(),
						},
					},
				},
			],
		},
	})
}
