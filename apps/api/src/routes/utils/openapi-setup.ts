import type { OpenAPIHono } from "@hono/zod-openapi"
import { env } from "../../env"
import { generateOpenAPISpecsPage } from "../../libs/scalar"

export function setupOpenAPIEndpoints<T extends OpenAPIHono>(
	router: T,
	routerPath: string,
	config: {
		pageTitle: string
		version: string
		description?: string
	},
) {
	// OpenAPI specification
	router.doc("/openapi", {
		openapi: "3.1.0",
		info: {
			title: env.APP_NAME,
			version: config.version,
			description: config.description,
		},
	})

	// OpenAPI documentation
	router.get(
		"/docs",
		generateOpenAPISpecsPage(config.pageTitle, {
			spec: { url: `${routerPath === "/" ? "" : routerPath}/openapi` },
		}),
	)
}
