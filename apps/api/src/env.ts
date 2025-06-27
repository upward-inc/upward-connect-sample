import { z } from "zod"

const envSchema = z.object({
	PORT: z.coerce.number().min(1000).max(65535),
	OIDC_ISSUER: z.string().url().startsWith("https://"),
	OIDC_AUDIENCE: z.string(),
	OIDC_JWT_SECRET: z.string().min(10),
	OIDC_JWT_EXPIRES_IN_SECOND: z.coerce.number().min(1),
})

export const env = envSchema.parse(process.env)

export type Environment = z.infer<typeof envSchema>
