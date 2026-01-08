import { renderHook } from "@testing-library/react"
import type { SearchParams } from "../../schema/auth"
import { useAuthorizeValidation } from "./use-authorize-validation"

describe("useAuthorizeValidation", () => {
	it("全ての必須パラメータが有効な場合、検証が成功すること", () => {
		// Arrange
		const searchParams: SearchParams = {
			response_type: "code",
			client_id: "valid_client_id",
			redirect_uri: "https://client.test.local/callback",
			scope: "openid profile email offline_access",
			state: "valid_state",
			nonce: "valid_nonce",
			code_challenge: "valid_code_challenge_string_with_43_chars_minimum",
			code_challenge_method: "S256",
		}
		const redirectFail = vi.fn()

		// Act
		const { result } = renderHook(() =>
			useAuthorizeValidation(searchParams, redirectFail),
		)

		// Assert
		expect(result.current.isValidating).toBe(false)
		expect(redirectFail).not.toHaveBeenCalled()
	})

	describe("redirect_uriの検証", () => {
		it.each([
			{
				title: "未指定",
				redirect_uri: undefined,
			},
			{
				title: "空文字",
				redirect_uri: "",
			},
		])(
			"redirect_uriが$titleの場合、エラーをthrowすること",
			({ redirect_uri }) => {
				// Arrange
				// Arrange
				global.alert = vi.fn() // alertをモック化
				const searchParams: SearchParams = {
					response_type: "code",
					client_id: "valid_client_id",
					redirect_uri,
					scope: "openid profile email offline_access",
					state: "valid_state",
					nonce: "valid_nonce",
					code_challenge: "valid_code_challenge_string_with_43_chars_minimum",
					code_challenge_method: "S256",
				}
				const redirectFail = vi.fn()

				// Act & Assert
				expect(() => {
					renderHook(() => useAuthorizeValidation(searchParams, redirectFail))
				}).toThrow("invalid redirect_uri")
				expect(global.alert).toHaveBeenCalledWith("redirect_uriが不正です")
				expect(redirectFail).not.toHaveBeenCalled()
			},
		)
	})

	describe("stateの検証", () => {
		it.each([
			{
				title: "未指定",
				state: undefined,
			},
			{
				title: "空文字",
				state: "",
			},
		])("stateが$titleの場合、redirectFailが呼ばれること", ({ state }) => {
			// Arrange
			const searchParams: SearchParams = {
				response_type: "code",
				client_id: "valid_client_id",
				redirect_uri: "https://client.test.local/callback",
				scope: "openid profile email offline_access",
				state,
				nonce: "valid_nonce",
				code_challenge: "valid_code_challenge_string_with_43_chars_minimum",
				code_challenge_method: "S256",
			}
			const redirectFail = vi.fn()

			// Act
			renderHook(() => useAuthorizeValidation(searchParams, redirectFail))

			// Assert
			expect(redirectFail).toHaveBeenCalledWith(
				"https://client.test.local/callback",
				{ error: "invalid_request", state: undefined },
			)
		})
	})

	describe("response_typeの検証", () => {
		it.each([
			{
				title: "未指定",
				response_type: undefined,
			},
			{
				title: "空文字",
				response_type: "",
			},
			{
				title: "code以外",
				response_type: "token",
			},
		])(
			"response_typeが$titleの場合、redirectFailが呼ばれること",
			({ response_type }) => {
				// Arrange
				const searchParams: SearchParams = {
					response_type,
					client_id: "valid_client_id",
					redirect_uri: "https://client.test.local/callback",
					scope: "openid profile email offline_access",
					state: "valid_state",
					nonce: "valid_nonce",
					code_challenge: "valid_code_challenge_string_with_43_chars_minimum",
					code_challenge_method: "S256",
				}
				const redirectFail = vi.fn()

				// Act
				renderHook(() => useAuthorizeValidation(searchParams, redirectFail))

				// Assert
				expect(redirectFail).toHaveBeenCalledWith(
					"https://client.test.local/callback",
					{ error: "unsupported_response_type", state: "valid_state" },
				)
			},
		)
	})

	describe("client_idの検証", () => {
		it.each([
			{
				title: "未指定",
				client_id: undefined,
			},
			{
				title: "空文字",
				client_id: "",
			},
		])(
			"client_idが$titleの場合、redirectFailが呼ばれること",
			({ client_id }) => {
				// Arrange
				const searchParams: SearchParams = {
					response_type: "code",
					client_id,
					redirect_uri: "https://client.test.local/callback",
					scope: "openid profile email offline_access",
					state: "valid_state",
					nonce: "valid_nonce",
					code_challenge: "valid_code_challenge_string_with_43_chars_minimum",
					code_challenge_method: "S256",
				}
				const redirectFail = vi.fn()

				// Act
				renderHook(() => useAuthorizeValidation(searchParams, redirectFail))

				// Assert
				expect(redirectFail).toHaveBeenCalledWith(
					"https://client.test.local/callback",
					{ error: "unauthorized_client", state: "valid_state" },
				)
			},
		)
	})

	describe("scopeの検証", () => {
		it.each([
			{
				title: "未指定",
				scope: undefined,
			},
			{
				title: "空文字",
				scope: "",
			},
			{
				title: "不正な値",
				scope: "invalid_scope_value",
			},
		])("scopeが$titleの場合、redirectFailが呼ばれること", ({ scope }) => {
			// Arrange
			const searchParams: SearchParams = {
				response_type: "code",
				client_id: "valid_client_id",
				redirect_uri: "https://client.test.local/callback",
				scope,
				state: "valid_state",
				nonce: "valid_nonce",
				code_challenge: "valid_code_challenge_string_with_43_chars_minimum",
				code_challenge_method: "S256",
			}
			const redirectFail = vi.fn()

			// Act
			renderHook(() => useAuthorizeValidation(searchParams, redirectFail))

			// Assert
			expect(redirectFail).toHaveBeenCalledWith(
				"https://client.test.local/callback",
				{ error: "invalid_scope", state: "valid_state" },
			)
		})
	})

	describe("nonceの検証", () => {
		it.each([
			{
				title: "未指定",
				nonce: undefined,
			},
			{
				title: "空文字",
				nonce: "",
			},
		])("nonceが$titleの場合、redirectFailが呼ばれること", ({ nonce }) => {
			// Arrange
			const searchParams: SearchParams = {
				response_type: "code",
				client_id: "valid_client_id",
				redirect_uri: "https://client.test.local/callback",
				scope: "openid profile email offline_access",
				state: "valid_state",
				nonce,
				code_challenge: "valid_code_challenge_string_with_43_chars_minimum",
				code_challenge_method: "S256",
			}
			const redirectFail = vi.fn()

			// Act
			renderHook(() => useAuthorizeValidation(searchParams, redirectFail))

			// Assert
			expect(redirectFail).toHaveBeenCalledWith(
				"https://client.test.local/callback",
				{ error: "invalid_request", state: "valid_state" },
			)
		})
	})

	describe("code_challengeの検証", () => {
		it.each([
			{
				title: "未指定",
				code_challenge: undefined,
			},
			{
				title: "空文字",
				code_challenge: "",
			},
			{
				title: "43文字未満",
				code_challenge: "a".repeat(42),
			},
			{
				title: "128文字超過",
				code_challenge: "a".repeat(129),
			},
		])(
			"code_challengeが$titleの場合、redirectFailが呼ばれること",
			({ code_challenge }) => {
				// Arrange
				const searchParams: SearchParams = {
					response_type: "code",
					client_id: "valid_client_id",
					redirect_uri: "https://client.test.local/callback",
					scope: "openid profile email offline_access",
					state: "valid_state",
					nonce: "valid_nonce",
					code_challenge,
					code_challenge_method: "S256",
				}
				const redirectFail = vi.fn()

				// Act
				renderHook(() => useAuthorizeValidation(searchParams, redirectFail))

				// Assert
				expect(redirectFail).toHaveBeenCalledWith(
					"https://client.test.local/callback",
					{ error: "invalid_request", state: "valid_state" },
				)
			},
		)
	})

	describe("code_challenge_methodの検証", () => {
		it.each([
			{
				title: "未指定",
				code_challenge_method: undefined,
			},
			{
				title: "空文字",
				code_challenge_method: "",
			},
			{
				title: "S256以外",
				code_challenge_method: "plain",
			},
		])(
			"code_challenge_methodが$titleの場合、redirectFailが呼ばれること",
			({ code_challenge_method }) => {
				// Arrange
				const searchParams: SearchParams = {
					response_type: "code",
					client_id: "valid_client_id",
					redirect_uri: "https://client.test.local/callback",
					scope: "openid profile email offline_access",
					state: "valid_state",
					nonce: "valid_nonce",
					code_challenge: "valid_code_challenge_string_with_43_chars_minimum",
					code_challenge_method,
				}
				const redirectFail = vi.fn()

				// Act
				renderHook(() => useAuthorizeValidation(searchParams, redirectFail))

				// Assert
				expect(redirectFail).toHaveBeenCalledWith(
					"https://client.test.local/callback",
					{ error: "invalid_request", state: "valid_state" },
				)
			},
		)
	})
})
