import { Hono } from "hono"
import { describeRoute } from "hono-openapi"
import { env } from "../../env"

const wellKnownRouter = new Hono()

wellKnownRouter.get(
	"openid-configuration",
	describeRoute({
		description:
			"OIDC 1.0 で定められた OpenID プロバイダーに関する情報を返却する",
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

export { wellKnownRouter }
