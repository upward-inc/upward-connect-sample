import { createPublicKey } from "node:crypto"
import type { Jwk, PrivateKey } from "../../schema/auth"

/**
 * 秘密鍵から公開鍵を抽出してJWK形式で返す
 * @param privateKey PrivateKeyオブジェクト
 * @returns JWK形式の公開鍵
 */
export const extractPublicKeyAsJwkFromPrivateKey = (
	privateKey: PrivateKey,
): Jwk => {
	const kid = privateKey.id
	const key = privateKey.private_key_pem
	// PEM形式の秘密鍵からPublicKeyオブジェクトを作成
	const publicKey = createPublicKey(key)

	// JWK形式でエクスポート
	const jwk = publicKey.export({ format: "jwk" }) as Partial<Jwk>

	if (!jwk.kty || !jwk.n || !jwk.e) {
		return {} as Jwk
	}

	return {
		kty: jwk.kty,
		n: jwk.n,
		e: jwk.e,
		kid,
		use: "sig",
		alg: "RS256",
	}
}
