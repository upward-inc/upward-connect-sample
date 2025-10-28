import type { Prisma } from "@prisma/client"
import { env } from "../src/env"
import {
	encryptAndEncodeByBase64,
	generatePrivateKeyPem,
	toCryptoKey,
} from "../src/utility/crypto"
import { addDays } from "../src/utility/date"

export async function seedJwkPrivateKeys(prisma: Prisma.TransactionClient) {
	const privateKeysPromises = Array.from({
		length: 120,
	}).map(async (_, index) => {
		const validate_at = addDays(
			new Date(),
			(index - 1) * env.OIDC_KEY_ROTATION_PERIOD_IN_DAY, // 旧鍵も生成したいため(index-1)で調整
		)
		const key = await toCryptoKey(
			env.OIDC_ENCRYPT_PRIVATE_KEY_SECRET,
			"encrypt",
		)
		return Promise.all(
			Array.from({ length: 3 }).map(async () => {
				const iv = crypto.getRandomValues(new Uint8Array(16))

				return {
					encrypted_private_key_pem: await generatePrivateKeyPem().then(
						(privateKey) => encryptAndEncodeByBase64(privateKey, key, iv),
					),
					base64_iv: Buffer.from(iv).toString("base64"),
					validate_at: validate_at,
					expire_at: addDays(validate_at, env.OIDC_KEY_ROTATION_PERIOD_IN_DAY),
					closed_at: addDays(
						validate_at,
						env.OIDC_KEY_ROTATION_PERIOD_IN_DAY * 2,
					),
				}
			}),
		)
	})

	const privateKeys = (await Promise.all(privateKeysPromises)).flat()

	const records = await prisma.jwk_private_key.createMany({
		data: privateKeys,
	})

	console.info(`>> jwk_private_key records created: ${records.count}`)

	return records
}
