import { Hono } from "hono"
import { env } from "../../env"
import { describeRoute } from "../../libs/hono-openapi"
import { OidcConfigurationResultSchema } from "../../schema/auth"

export const wellKnownRouter = new Hono().get(
	"/openid-configuration",
	describeRoute({
		description:
			"OIDC 1.0 で定められた OpenID プロバイダーに関する情報を返却する",
		schema: OidcConfigurationResultSchema,
	}),
	async (c) => {
		// OpenID Connect Discoveryドキュメントを返す
		// https://openid.net/specs/openid-connect-discovery-1_0.html
		return c.json({
			issuer: env.OIDC_ISSUER,
			authorization_endpoint: `${env.OIDC_ISSUER}/oauth2/authorize`,
			token_endpoint: `${env.OIDC_ISSUER}/oauth2/token`,
			userinfo_endpoint: `${env.OIDC_ISSUER}/oauth2/userinfo`,
			jwks_uri: `${env.OIDC_ISSUER}/oauth2/jwks.json`,
			response_types_supported: ["code"],
			subject_types_supported: ["public"],
			id_token_signing_alg_values_supported: ["RS256"],
			scopes_supported: ["openid", "profile", "email", "offline_access"],
		})
	},
)
