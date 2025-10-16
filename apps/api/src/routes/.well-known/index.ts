import { OpenAPIHono, createRoute } from "@hono/zod-openapi"
import { env } from "../../env"
import { OidcConfigurationResultSchema } from "../../schema/auth"

export const wellKnownRouter = new OpenAPIHono().openapi(
	createRoute({
		method: "get",
		path: "/openid-configuration",
		description:
			"OIDC 1.0 で定められた OpenID プロバイダーに関する情報を返却する",
		responses: {
			200: {
				description: "Success",
				content: {
					"application/json": { schema: OidcConfigurationResultSchema },
				},
			},
		},
	}),
	(c) => {
		// OpenID Connect Discoveryドキュメントを返す
		// https://openid.net/specs/openid-connect-discovery-1_0.html
		return c.json(
			{
				issuer: env.OIDC_ISSUER,
				authorization_endpoint: `${env.OIDC_ISSUER}/oauth2/authorize`,
				token_endpoint: `${env.OIDC_ISSUER}/oauth2/token`,
				userinfo_endpoint: `${env.OIDC_ISSUER}/oauth2/userinfo`,
				jwks_uri: `${env.OIDC_ISSUER}/oauth2/jwks.json`,
				response_types_supported: ["code" as const],
				subject_types_supported: ["public" as const],
				id_token_signing_alg_values_supported: ["RS256" as const],
				scopes_supported: [
					"openid" as const,
					"profile" as const,
					"email" as const,
					"offline_access" as const,
				],
			},
			200,
		)
	},
)
