import type { Hono } from "hono"
import { generateOpenAPISpecs } from "../../libs/hono-openapi"
import { generateOpenAPISpecsPage } from "../../libs/scalar"

export function setupOpenAPIEndpoints<T extends Hono>(
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
			generateOpenAPISpecs(router, {
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
