import { Scalar } from "@scalar/hono-api-reference"
import { configuration } from "../configuration"

export const generateOpenAPISpecsPage = (
	pageTitle: string,
	{
		spec,
	}: {
		spec: { url: string }
	},
) => {
	return Scalar({
		theme: "saturn",
		pageTitle: `${pageTitle} | ${configuration.APP_NAME}`,
		spec,
	})
}
