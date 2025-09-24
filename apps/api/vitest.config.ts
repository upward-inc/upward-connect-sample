import { defineConfig } from "vitest/config"

export default defineConfig({
	test: {
		environment: "node",
		include: ["src/**/*.test.ts"],
		setupFiles: ["./src/test/setup.ts"],
		testTimeout: 60000, // 60 seconds for tests with container startup
		hookTimeout: 60000, // 60 seconds for setup/teardown (container operations)
		// Run tests sequentially to avoid container conflicts
		sequence: {
			concurrent: false,
		},
		// Test environment variables (will be overridden by testcontainers)
		env: {
			OIDC_ISSUER: "https://iss.test.upward.jp",
			OIDC_AUDIENCE: "https://aud.test.upward.jp",
			OIDC_TOKEN_SECRET: "test-secret-key-for-tests-12345",
			OIDC_REFRESH_TOKEN_SECRET: "test-refresh-secret-key-for-tests-12345",
		},
		// Use threads pool for better testcontainers compatibility
		pool: "threads",
		// Global setup for testcontainers
		globals: true,
	},
})
