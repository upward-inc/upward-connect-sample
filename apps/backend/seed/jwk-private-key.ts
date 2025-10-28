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
		length: 120, // periodが90日の場合に90*120=10800日=約30年分となる
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
				// セキュリティを強化するためのランダムな初期値としてivを使用
				// これにより、同じ秘密鍵データでも毎回異なる暗号化結果が生成され、セキュリティが向上
				const iv = crypto.getRandomValues(new Uint8Array(16))

				return {
					// 以下のステップで値を生成
					// 1. PEM形式で秘密鍵を生成
					// 2. `env.OIDC_ENCRYPT_PRIVATE_KEY_SECRET,`を用いて1.で生成した秘密鍵を暗号化
					// 3. 2.で生成した暗号化データをBase64エンコード
					encrypted_private_key_pem: await generatePrivateKeyPem().then(
						(privateKey) => encryptAndEncodeByBase64(privateKey, key, iv),
					),
					// ivをBase64エンコード
					base64_iv: Buffer.from(iv).toString("base64"),
					// 鍵が有効となる日時
					validate_at: validate_at,
					// 鍵が失効となる日時
					expire_at: addDays(validate_at, env.OIDC_KEY_ROTATION_PERIOD_IN_DAY),
					// jwksエンドポイントに鍵の公開が停止される日時
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
