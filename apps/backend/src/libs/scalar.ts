import { Scalar } from "@scalar/hono-api-reference"
import { env } from "../env"

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
		pageTitle: `${pageTitle} | ${env.APP_NAME}`,
		spec,
	})
}
