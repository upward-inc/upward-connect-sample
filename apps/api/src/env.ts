import { z } from "zod"

const envSchema = z.object({
	PORT: z.coerce.number().min(1000).max(65535),
	OAUTH2_AUTH_CODE_EXPIRES_IN_MINUTE: z.coerce.number().min(1),
	OIDC_ISSUER: z.string().url().startsWith("https://"),
	OIDC_AUDIENCE: z.string(),
	OIDC_TOKEN_SECRET: z.string().min(10),
	OIDC_TOKEN_EXPIRES_IN_MINUTE: z.coerce.number().min(1),
	OIDC_REFRESH_TOKEN_SECRET: z.string().min(10),
	OIDC_REFRESH_TOKEN_EXPIRES_IN_DAY: z.coerce.number().min(1),
})

export const env = envSchema.parse(process.env)

export type Environment = z.infer<typeof envSchema>
