import tailwindcss from "@tailwindcss/vite"
import { TanStackRouterVite } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "")

	return {
		plugins: [
			TanStackRouterVite({ target: "react", autoCodeSplitting: true }),
			react(),
			tailwindcss(),
		],
		define: {
			...Object.keys(env).reduce(
				(prev: Record<string, string>, key) => {
					prev[`process.env.${key}`] = JSON.stringify(env[key])

					return prev
				},
				{} as Record<string, string>,
			),
		},
	}
})
