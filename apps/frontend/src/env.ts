import { z } from "zod"

const envSchema = z.object({
	API_URL: z.url(),
})

export const env = envSchema.parse({
	API_URL: import.meta.env.VITE_API_URL,
})

export type Environment = z.infer<typeof envSchema>
