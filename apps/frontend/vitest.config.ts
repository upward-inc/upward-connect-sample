import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
	plugins: [react()],
	test: {
		globals: true,
		passWithNoTests: true,
		environment: "jsdom",
		setupFiles: "./src/test/setup.ts",
		testTimeout: 10000,
	},
})
