import { sign } from "jsonwebtoken"
import type * as ms from "ms"
import { testPrisma } from "../integration-setup"

function createToken(userId: string, expiresIn?: ms.StringValue) {
	const secret = process.env.OIDC_TOKEN_SECRET
	if (!secret) {
		throw new Error("OIDC_TOKEN_SECRET environment variable is not set")
	}
	const issuer = process.env.OIDC_ISSUER
	const audience = process.env.OIDC_AUDIENCE

	return sign({}, secret, {
		algorithm: "HS256",
		issuer,
		subject: userId,
		audience,
		expiresIn: expiresIn || "1h", // Default to 1 hour if not provided
	})
}

export function createValidToken(userId: string) {
	return createToken(userId, "1h")
}

export function createExpiredToken(userId: string) {
	return createToken(userId, "-1h")
}

/**
 * Create a test OAuth client for integration tests
 */
export async function createIntegrationTestOAuthClient(clientData: {
	name: string
	secret: string
	redirect_uris: string
	scopes: string
}) {
	try {
		const client = await testPrisma.oauth_client.create({
			data: {
				name: `test_${clientData.name}`,
				secret: clientData.secret,
				redirect_uris: clientData.redirect_uris,
				scopes: clientData.scopes,
			},
		})

		return client
	} catch (error) {
		console.error("Error creating test OAuth client:", error)
		throw error
	}
}

/**
 * Create a refresh token for testing
 */
export function createRefreshToken(userId: string) {
	const secret = process.env.OIDC_REFRESH_TOKEN_SECRET
	if (!secret) {
		throw new Error("OIDC_REFRESH_TOKEN_SECRET environment variable is not set")
	}
	const issuer = process.env.OIDC_ISSUER
	const audience = process.env.OIDC_AUDIENCE

	return sign({}, secret, {
		algorithm: "HS256",
		issuer,
		subject: userId,
		audience,
		expiresIn: "30d", // 30 days for refresh token
	})
}

/**
 * Create an expired refresh token for testing
 */
export function createExpiredRefreshToken(userId: string) {
	const secret = process.env.OIDC_REFRESH_TOKEN_SECRET
	if (!secret) {
		throw new Error("OIDC_REFRESH_TOKEN_SECRET environment variable is not set")
	}
	const issuer = process.env.OIDC_ISSUER
	const audience = process.env.OIDC_AUDIENCE

	return sign({}, secret, {
		algorithm: "HS256",
		issuer,
		subject: userId,
		audience,
		expiresIn: "-1d", // Expired 1 day ago
	})
}
