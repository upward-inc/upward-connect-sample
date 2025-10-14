import { zValidator } from "@hono/zod-validator"
import type { Hono } from "hono"
import * as honoOpenApi from "hono-openapi"
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
					schema: honoOpenApi.resolver(schema),
				},
			}
		: undefined
	return honoOpenApi.describeRoute({
		description,
		responses: {
			200: {
				description: "Success",
				content: content,
			},
		},
	})
}

export const validator = zValidator

export const generateOpenAPISpecs = (
	router: Hono,
	routerPath: string,
	{
		version,
		description,
	}: {
		version: string
		description?: string
	},
) => {
	return honoOpenApi.openAPIRouteHandler(router, {
		excludeStaticFile: false,
		documentation: {
			info: {
				title: env.APP_NAME,
				version,
				description,
			},
			servers: [
				{
					url: `http://localhost:{port}${routerPath}`,
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
