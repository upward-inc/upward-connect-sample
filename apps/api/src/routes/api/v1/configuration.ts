import { Hono } from "hono"
import { getConfiguration } from "../../../domain/configuration"
import { describeRoute } from "../../../libs/hono-openapi"
import { ConfigurationSchema } from "../../../schema/configuration"

export const configurationRouter = new Hono().get(
	"/",
	describeRoute({
		description: "構成データを返却する",
		schema: ConfigurationSchema,
	}),
	async (c) => {
		const configuration = getConfiguration()

		return c.json(configuration)
	},
)
