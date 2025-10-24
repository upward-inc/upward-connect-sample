import { type KeyObject, createPublicKey, generateKeyPair } from "node:crypto"
import type { Jwk } from "../schema/auth"

export async function generatePrivateKeyPem(): Promise<string> {
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

export async function toCryptoKey(key: string, usage: "encrypt" | "decrypt") {
	return await crypto.subtle.importKey(
		"raw",
		Buffer.from(key),
		"AES-GCM",
		false,
		[usage],
	)
}

export async function encryptAndEncodeByBase64(
	target: string,
	key: CryptoKey,
	iv: Uint8Array<ArrayBuffer>,
) {
	const encryptedBuffer = await crypto.subtle.encrypt(
		{
			name: "AES-GCM",
			iv,
		},
		key,
		Buffer.from(target),
	)
	return Buffer.from(encryptedBuffer).toString("base64")
}

export async function decryptAndDecodeByBase64(
	encodedTarget: string,
	key: CryptoKey,
	iv: Uint8Array<ArrayBuffer>,
) {
	const decryptedBuffer = await crypto.subtle.decrypt(
		{
			name: "AES-GCM",
			iv,
		},
		key,
		Buffer.from(encodedTarget, "base64"),
	)
	return Buffer.from(decryptedBuffer).toString()
}

/**
 * JWKをPEM形式に変換する
 * @param jwk JWKオブジェクト
 * @returns PEM形式の公開鍵
 */
export function convertJwkToPem(jwk: Jwk) {
	const jwkObject = {
		kty: jwk.kty,
		n: jwk.n,
		e: jwk.e,
	}

	const pem = createPublicKey({ key: jwkObject, format: "jwk" }).export({
		type: "spki",
		format: "pem",
	})

	return pem.toString()
}
