import { sign, verify } from "jsonwebtoken"
import { afterEach, describe, expect, it } from "vitest"
import { app } from "../.."
import { type Jwk, JwkSchema, PrivateKeySchema } from "../../schema/auth"
import {
	createTestPrivateKey,
	deleteAllTestPrivateKeys,
} from "../../test/utils/auth"
import { convertJwkToPem } from "../../utility/crypto"

describe("GET /oauth2/jwks - OIDC 1.0 公開鍵群の取得", () => {
	afterEach(async () => {
		// テスト毎に対象データを削除
		await deleteAllTestPrivateKeys()
	})

	/**
	 * Jwks APIへのGETリクエストを送信する
	 */
	async function requestGet() {
		return await app.request("/oauth2/jwks", {
			method: "GET",
		})
	}

	it("リクエストが正常に処理された場合、200ステータスを返すこと", async () => {
		// Arrange
		await createTestPrivateKey()

		// Act
		const response = await requestGet()

		// Assert
		expect(response.status).toBe(200)
	})

	it("公開鍵データが存在する場合、JWK形式で公開鍵情報を返すこと", async () => {
		// Arrange
		await createTestPrivateKey()

		// Act
		const response = await requestGet()

		// Assert
		const body = await response.json()

		expect(body).toHaveProperty("keys")
		expect(Array.isArray(body.keys)).toBe(true)
		expect(JwkSchema.parse(body.keys[0])).toBeTruthy()
	})

	it("非公開になった鍵は返されないこと", async () => {
		// Arrange
		// 非公開になった鍵
		const closedKey = await createTestPrivateKey({
			validate_at: new Date(Date.now() - 3000),
			expire_at: new Date(Date.now() - 2000),
			closed_at: new Date(Date.now() - 1000),
		})
		// 旧鍵
		await createTestPrivateKey({
			validate_at: new Date(Date.now() - 2000),
			expire_at: new Date(Date.now() - 1000),
			closed_at: new Date(Date.now() + 1000),
		})
		// 現行鍵
		await createTestPrivateKey({
			validate_at: new Date(Date.now() - 1000),
			expire_at: new Date(Date.now() + 1000),
			closed_at: new Date(Date.now() + 2000),
		})
		// 未来鍵
		await createTestPrivateKey({
			validate_at: new Date(Date.now() + 1000),
			expire_at: new Date(Date.now() + 2000),
			closed_at: new Date(Date.now() + 3000),
		})

		// Act
		const response = await requestGet()

		// Assert
		const body = await response.json()
		expect(
			body.keys.find((key: { kid: string }) => key.kid === closedKey.id),
		).toBeUndefined()
	})

	it("正しい公開鍵が返されること", async () => {
		// Arrange
		const privateKey = await PrivateKeySchema.parseAsync(
			await createTestPrivateKey(),
		)
		const encrypted = sign({ test: "test" }, privateKey.private_key_pem, {
			keyid: privateKey.id,
			algorithm: "RS256",
			expiresIn: "1h",
		})
		// Act
		const response = await requestGet()

		// Assert
		const body = await response.json()
		const jwk = body.keys.find(
			(key: { kid: string }) => key.kid === privateKey.id,
		) as Jwk
		const publicKey = convertJwkToPem(jwk)
		const decrypted = verify(encrypted, publicKey, {
			algorithms: ["RS256"],
		}) as { test: string }

		expect(decrypted.test).toBe("test")
	})
})
