import type { OpenAPIHono } from "@hono/zod-openapi"
import { generateOpenAPISpecs } from "../../libs/hono-openapi"
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
	router
		// OpenAPI specification
		.get(
			"/openapi",
			generateOpenAPISpecs(router, routerPath, {
				version: config.version,
				description: config.description,
			}),
		)
		// OpenAPI documentation
		.get(
			"/docs",
			generateOpenAPISpecsPage(config.pageTitle, {
				spec: { url: `${routerPath === "/" ? "" : routerPath}/openapi` },
			}),
		)
}
