import { addDay, date, dayEnd, dayStart } from "@formkit/tempo"
import type { Prisma } from "@prisma/client"
import { env } from "../src/env"
import {
	encryptAndEncodeByBase64,
	generatePrivateKeyPem,
	toCryptoKey,
} from "../src/utility/crypto"

// 鍵のローテーション期間（有効期限）
const KEY_ROTATION_PERIOD_IN_DAY = env.OIDC_KEY_ROTATION_PERIOD_IN_DAY

// 生成する期間の数
const TOTAL_PERIODS = 120

// 1つの期間内に生成する鍵の数
const KEYS_PER_PERIOD = 3

// 鍵の失効から公開停止までの猶予期間
const CLOSED_AT_OFFSET_IN_TERM = 2

export async function seedJwkPrivateKeys(prisma: Prisma.TransactionClient) {
	const now = date()

	// PEM形式の秘密鍵
	const privateKeyPem = await generatePrivateKeyPem()

	// 暗号化用のキー
	const encryptKey = await toCryptoKey(
		env.OIDC_ENCRYPT_PRIVATE_KEY_SECRET,
		"encrypt",
	)

	const privateKeysPromises = Array.from({ length: TOTAL_PERIODS }).map(
		async (_, index) => {
			const baseDate = addDay(
				now,
				// indexから1を引いた値とローテーション期間を乗算することで一つ前の期間（= 旧鍵）からレコードを生成
				(index - 1) * KEY_ROTATION_PERIOD_IN_DAY,
			)

			// 鍵が有効となる日時
			const validateAt = dayStart(baseDate)

			// 鍵が失効となる日時
			const expireAt = addDay(
				dayEnd(validateAt),
				KEY_ROTATION_PERIOD_IN_DAY - 1,
			)

			// jwksエンドポイントで鍵の公開が停止される日時
			const closedAt = addDay(
				dayEnd(validateAt),
				KEY_ROTATION_PERIOD_IN_DAY * CLOSED_AT_OFFSET_IN_TERM - 1,
			)

			return Promise.all(
				Array.from({ length: KEYS_PER_PERIOD }).map(async () => {
					// セキュリティを強化するためのランダムな初期値としてivを使用
					// これにより、同じ秘密鍵データでも毎回異なる暗号化結果が生成され、セキュリティが向上
					const iv = crypto.getRandomValues(new Uint8Array(16))

					// 秘密鍵（暗号化 + Base64エンコード）
					const encryptedPrivateKeyPem = await encryptAndEncodeByBase64(
						privateKeyPem,
						encryptKey,
						iv,
					)

					// iv（Base64エンコード）
					const base64Iv = Buffer.from(iv).toString("base64")

					return {
						encrypted_private_key_pem: encryptedPrivateKeyPem,
						base64_iv: base64Iv,
						validate_at: validateAt,
						expire_at: expireAt,
						closed_at: closedAt,
					}
				}),
			)
		},
	)

	const privateKeys = (await Promise.all(privateKeysPromises)).flat()

	const records = await prisma.jwk_private_key.createMany({
		data: privateKeys,
	})

	console.info(`>> jwk_private_key records created: ${records.count}`)

	return records
}
