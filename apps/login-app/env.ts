import { z } from "zod"

const envSchema = z.object({
	PORT: z.coerce.number().min(1000).max(65535),
	API_URL: z
		.string()
		.url()
		.regex(/^(https:\/\/|http:\/\/localhost(:[0-9]+)?(\/.*)?$)/), // start with https:// or http://localhost:[port]
})

export const env = envSchema.parse(process.env)

export type Environment = z.infer<typeof envSchema>
