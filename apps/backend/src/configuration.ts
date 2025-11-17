import { z } from "./libs/zod"

const envSchema = z.object({
	APP_NAME: z.string(),
	PORT: z.coerce.number().min(1000).max(65535),
	OAUTH2_AUTH_CODE_EXPIRES_IN_MINUTE: z.coerce.number().min(1),
	OIDC_ISSUER: z.union([
		z.url().startsWith("https://"),
		z.url().startsWith("http://localhost:"),
	]),
	OIDC_TOKEN_SECRET: z.string().min(10),
	OIDC_TOKEN_EXPIRES_IN_MINUTE: z.coerce.number().min(1),
	OIDC_REFRESH_TOKEN_SECRET: z.string().min(10),
	OIDC_REFRESH_TOKEN_EXPIRES_IN_DAY: z.coerce.number().min(1),
	OIDC_KEY_ROTATION_PERIOD_IN_DAY: z.coerce.number().min(1),
	OIDC_ENCRYPT_PRIVATE_KEY_SECRET: z.string().min(32).max(32),
})

export const configuration = {
	...envSchema.parse(process.env),
	LOCATION_ENTITIES: ["account", "lead", "sample"] as const,
}

export type Environment = z.infer<typeof envSchema>
