import { generateKeyPair } from "node:crypto"
import type { Prisma } from "@prisma/client"
import { env } from "../src/env"

async function generatePrivateKey(): Promise<string> {
	return new Promise((resolve, reject) => {
		generateKeyPair(
			"rsa",
			{
				modulusLength: 2048,
				publicExponent: 0x10001,
				privateKeyEncoding: {
					type: "pkcs1",
					format: "pem",
				},
				publicKeyEncoding: {
					type: "spki",
					format: "pem",
				},
			},
			(err, _, privateKey) => {
				if (err) {
					reject(err)
				} else {
					resolve(privateKey)
				}
			},
		)
	})
}

async function encodeBase64PrivateKey(
	privateKeyPem: string,
	iv: Uint8Array<ArrayBuffer>,
) {
	const key = await crypto.subtle.importKey(
		"raw",
		Buffer.from(env.OIDC_ENCRYPT_PRIVATE_KEY_SECRET),
		"AES-GCM",
		false,
		["encrypt"],
	)
	const encryptedBuffer = await crypto.subtle.encrypt(
		{
			name: "AES-GCM",
			iv,
		},
		key,
		Buffer.from(privateKeyPem),
	)
	return Buffer.from(encryptedBuffer).toString("base64")
}

function addDays(date: Date, days: number) {
	const result = new Date(date)
	result.setDate(result.getDate() + days)
	return result
}

export async function seedPrivateKeys(prisma: Prisma.TransactionClient) {
	const privateKeysPromises = Array.from({
		length: 30,
	}).map((_, index) => {
		const iv = crypto.getRandomValues(new Uint8Array(16))
		const validate_at = addDays(
			new Date(),
			(index - 1) * env.OIDC_KEY_ROTATION_PERIOD_IN_DAY, // 旧鍵も生成するため(index-1)で調整
		)
		return Promise.all(
			Array.from({ length: 3 }).map(async () => ({
				encrypted_private_key_pem: await generatePrivateKey().then(
					(privateKey) => encodeBase64PrivateKey(privateKey, iv),
				),
				base64_iv: Buffer.from(iv).toString("base64"),
				validate_at: validate_at,
				expire_at: addDays(validate_at, env.OIDC_KEY_ROTATION_PERIOD_IN_DAY),
				closed_at: addDays(
					validate_at,
					env.OIDC_KEY_ROTATION_PERIOD_IN_DAY * 2,
				),
			})),
		)
	})

	const privateKeys = (await Promise.all(privateKeysPromises)).flat()

	const records = await prisma.private_key.createMany({
		data: privateKeys,
	})

	console.info(`>> private_key records created: ${records.count}`)

	return records
}
