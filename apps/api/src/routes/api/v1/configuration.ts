import { Hono } from "hono"
import { describeRoute } from "../../../libs/hono-openapi"
import { ConfigurationResponseSchema } from "../../../schema/configuration"

export const configurationRouter = new Hono().get(
	"/",
	describeRoute({
		description: "構成データを返却する",
		schema: ConfigurationResponseSchema,
	}),
	async (c) => {
		return c.json({
			entity_name: {
				user: "user",
				account: "account",
				lead: "lead",
				contact: "contact",
				activity: "activity",
				phone_call: "phone_call",
			},
		})
	},
)