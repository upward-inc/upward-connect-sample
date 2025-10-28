import type { Prisma } from "@prisma/client"
import { sign } from "jsonwebtoken"
import type * as ms from "ms"
import { env } from "../../env"
import {
	encryptAndEncodeByBase64,
	generatePrivateKeyPem,
	toCryptoKey,
} from "../../utility/crypto"
import { addDays } from "../../utility/date"
import { testPrisma } from "../setup"

export interface PrivateKeyData
	extends Omit<
		Prisma.jwk_private_keyCreateInput,
		| "encrypted_private_key_pem"
		| "base64_iv"
		| "validate_at"
		| "expire_at"
		| "closed_at"
	> {
	private_key_pem?: string
	iv?: Uint8Array<ArrayBuffer>
	validate_at?: Date
	expire_at?: Date
	closed_at?: Date
}

function createToken(userId: string, expiresIn?: ms.StringValue) {
	const secret = process.env.OIDC_TOKEN_SECRET
	if (!secret) {
		throw new Error("OIDC_TOKEN_SECRET environment variable is not set")
	}
	const issuer = process.env.OIDC_ISSUER
	const audience = "test-audience"

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
 * Create a test OAuth client for tests
 */
export async function createTestOAuthClient(clientData: {
	name: string
	secret: string
	redirect_uris: string
	scopes: string
}) {
	const client = await testPrisma.oauth_client.create({
		data: {
			name: `test_${clientData.name}`,
			secret: clientData.secret,
			redirect_uris: clientData.redirect_uris,
			scopes: clientData.scopes,
		},
	})

	return client
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
	const audience = "test-audience"

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
	const audience = "test-audience"

	return sign({}, secret, {
		algorithm: "HS256",
		issuer,
		subject: userId,
		audience,
		expiresIn: "-1d", // Expired 1 day ago
	})
}

/**
 * 秘密鍵データの作成
 * dataの指定がない場合は
 * - validate_at: 現在日時
 * - expire_at: 現在日時 + env.OIDC_KEY_ROTATION_PERIOD_IN_DAY
 * - closed_at: 現在日時 + env.OIDC_KEY_ROTATION_PERIOD_IN_DAY * 2
 * が設定される
 */
export async function createTestPrivateKey(data?: PrivateKeyData) {
	const privateKey = await testPrisma.jwk_private_key.create({
		data: await toPrivateKeyCreateInput(data),
		select: { id: true },
	})

	return await testPrisma.jwk_private_key.findUniqueOrThrow({
		where: { id: privateKey.id },
	})
}

/**
 * 秘密鍵データの一括作成
 */
export async function createManyTestPrivateKeys(data: Array<PrivateKeyData>) {
	return await testPrisma.jwk_private_key.createMany({
		data: await Promise.all(data.map((d) => toPrivateKeyCreateInput(d))),
	})
}

/**
 * 秘密鍵データの全削除
 */
export async function deleteAllTestPrivateKeys() {
	await testPrisma.jwk_private_key.deleteMany()
}

/**
 * 秘密鍵データの削除（レコードID指定）
 */
export async function deleteTestPrivateKeyById(id: string) {
	await testPrisma.jwk_private_key.delete({ where: { id } })
}

async function toPrivateKeyCreateInput(
	data?: PrivateKeyData,
): Promise<Prisma.jwk_private_keyCreateInput> {
	const key = await toCryptoKey(env.OIDC_ENCRYPT_PRIVATE_KEY_SECRET, "encrypt")
	const iv = data?.iv ?? crypto.getRandomValues(new Uint8Array(16))
	return {
		encrypted_private_key_pem: await encryptAndEncodeByBase64(
			data?.private_key_pem ?? (await generatePrivateKeyPem()),
			key,
			iv,
		),
		base64_iv: Buffer.from(iv).toString("base64"),
		validate_at: data?.validate_at ?? new Date(),
		expire_at:
			data?.expire_at ??
			addDays(new Date(), env.OIDC_KEY_ROTATION_PERIOD_IN_DAY),
		closed_at:
			data?.closed_at ??
			addDays(new Date(), env.OIDC_KEY_ROTATION_PERIOD_IN_DAY * 2),
	}
}
