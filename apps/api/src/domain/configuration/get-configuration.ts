import type { Configuration } from "../../schema/configuration"

export const getConfiguration = (): Configuration => {
	return {
		entity_name: {
			user: "user",
			account: "account",
			lead: "lead",
			contact: "contact",
			activity: "activity",
			phone_call: "phone_call",
		},
	}
}