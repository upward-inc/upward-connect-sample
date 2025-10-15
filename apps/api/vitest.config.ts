import { defineConfig } from "vitest/config"

export default defineConfig({
	test: {
		environment: "node",
		include: ["src/**/*.test.ts"],
		globalSetup: ["./src/test/globalSetup.ts"],
		setupFiles: ["./src/test/setup.ts"],
		testTimeout: 60000, // 60 seconds for tests with container startup
		hookTimeout: 60000, // 60 seconds for setup/teardown (container operations)
		sequence: {
			concurrent: false,
		},
		pool: "forks",
		poolOptions: {
			forks: {
				singleFork: true,
			},
		},
		// Test environment variables (will be overridden by testcontainers)
		env: {
			APP_NAME: "test app",
			PORT: "8787",
			OAUTH2_AUTH_CODE_EXPIRES_IN_MINUTE: "10",
			OIDC_ISSUER: "https://iss.test.upward.jp",
			OIDC_TOKEN_SECRET: "test-secret-key-for-tests-12345",
			OIDC_TOKEN_EXPIRES_IN_MINUTE: "10",
			OIDC_REFRESH_TOKEN_SECRET: "test-refresh-secret-key-for-tests-12345",
			OIDC_REFRESH_TOKEN_EXPIRES_IN_DAY: "180",
		},
		// Global setup for testcontainers
		globals: true,
	},
})
