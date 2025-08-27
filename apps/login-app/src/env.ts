import { z } from "zod"

const envSchema = z.object({
	API_URL: z
		.string()
		.url()
		.regex(/^(https:\/\/|http:\/\/localhost(:[0-9]+)?(\/.*)?$)/), // start with https:// or http://localhost:[port]
})

const processedEnv = {
	API_URL: import.meta.env.VITE_API_URL,
}

export const env = envSchema.parse(processedEnv)

export type Environment = z.infer<typeof envSchema>
