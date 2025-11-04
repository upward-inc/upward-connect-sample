import { OpenAPIHono, createRoute } from "@hono/zod-openapi"
import {
	type Configuration,
	ConfigurationSchema,
} from "../../../schema/configuration"

export const configurationRouter = new OpenAPIHono().openapi(
	createRoute({
		method: "get",
		path: "/",
		description: "UPWARDとの連携のために必要な構成データを取得する",
		responses: {
			200: {
				description: "Success",
				content: {
					"application/json": { schema: ConfigurationSchema },
				},
			},
		},
	}),
	(c) => {
		const configuration: Configuration = {
			entity_name: {
				user: "user",
				account: "account",
				lead: "lead",
				contact: "contact",
				activity: "activity",
				phone_call: "phone_call",
			},
			location_entities: ["account", "lead"],
		}

		return c.json(configuration, 200)
	},
)
