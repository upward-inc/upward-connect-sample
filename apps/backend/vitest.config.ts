import { defineConfig } from "vitest/config"

export default defineConfig({
	test: {
		environment: "node",
		include: ["src/**/*.test.ts"],
		globalSetup: ["./src/test/global-setup.ts"],
		setupFiles: ["./src/test/setup.ts"],
		testTimeout: 60000, // 60 seconds for tests with container startup
		hookTimeout: 60000, // 60 seconds for setup/teardown (container operations)
		// Run tests sequentially to avoid container conflicts
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
			FRONTEND_URL: "http://localhost:5173",
			APP_SESSION_SECRET: "password_at_least_32_characters_long",
			APP_SESSION_EXPIRES_IN_MINUTE: "15",
			PORT: "8787",
			OAUTH2_AUTH_CODE_EXPIRES_IN_MINUTE: "10",
			OIDC_ISSUER: "https://iss.test.upward.jp",
			OIDC_TOKEN_SECRET: "test-secret-key-for-tests-12345",
			OIDC_TOKEN_EXPIRES_IN_MINUTE: "10",
			OIDC_REFRESH_TOKEN_SECRET: "test-refresh-secret-key-for-tests-12345",
			OIDC_REFRESH_TOKEN_EXPIRES_IN_DAY: "180",
			OIDC_KEY_ROTATION_PERIOD_IN_DAY: "90",
			OIDC_ENCRYPT_PRIVATE_KEY_SECRET: "test-encryption-secret-for-tests",
		},
		// Global setup for testcontainers
		globals: true,
		reporters: process.env.GITHUB_ACTIONS
			? ["verbose", "github-actions"]
			: ["verbose"],
	},
})
