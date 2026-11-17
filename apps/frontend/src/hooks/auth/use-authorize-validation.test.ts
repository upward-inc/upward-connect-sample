import { renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { SearchParams } from "../../schema/auth"
import type { OAuthClientFetchResult } from "../../schema/oauth-client"
import { useAuthorizeValidation } from "./use-authorize-validation"

const redirectUri = "https://client.test.local/callback"

const validSearchParams: Required<SearchParams> = {
	response_type: "code",
	client_id: "valid_client_id",
	redirect_uri: redirectUri,
	scope: "openid profile email offline_access",
	state: "valid_state",
	nonce: "valid_nonce",
	code_challenge: "valid_code_challenge_string_with_43_chars_minimum",
	code_challenge_method: "S256",
}

const registeredClient: OAuthClientFetchResult = {
	isSuccess: true,
	isFetching: false,
	client: {
		id: "valid_client_id",
		name: "Sample App",
		scopes: ["openid", "profile", "email", "offline_access", "example_scope"],
		redirect_uris: [redirectUri],
	},
}

describe("useAuthorizeValidation", () => {
	beforeEach(() => {
		global.alert = vi.fn() // alertをモック化
	})

	it("全ての必須パラメータが有効な場合、検証が成功し、検証済みのパラメータとクライアント情報を返すこと", async () => {
		// Arrange
		const redirectFail = vi.fn()

		// Act
		const { result } = renderHook(() =>
			useAuthorizeValidation(validSearchParams, registeredClient, redirectFail),
		)

		// Assert
		await waitFor(() =>
			expect(result.current).toEqual({
				isValid: true,
				params: validSearchParams,
				client: {
					id: "valid_client_id",
					name: "Sample App",
					scopes: [
						"openid",
						"profile",
						"email",
						"offline_access",
						"example_scope",
					],
					redirect_uris: [redirectUri],
				},
			}),
		)
		expect(redirectFail).not.toHaveBeenCalled()
	})

	it("クライアント情報の取得中は、検証を完了せずリダイレクトもしないこと", () => {
		// Arrange
		const redirectFail = vi.fn()

		// Act
		const { result } = renderHook(() =>
			useAuthorizeValidation(
				{ ...validSearchParams, state: undefined },
				{ isFetching: true },
				redirectFail,
			),
		)

		// Assert
		expect(result.current).toEqual({ isValid: false })
		expect(redirectFail).not.toHaveBeenCalled()
	})

	it("検証に成功したあとにクライアント情報が取得中に戻った場合（client_idの変更等）、前回の検証結果を返さないこと", async () => {
		// Arrange
		const redirectFail = vi.fn()
		const { result, rerender } = renderHook(
			({ client }) =>
				useAuthorizeValidation(validSearchParams, client, redirectFail),
			{ initialProps: { client: registeredClient } },
		)
		await waitFor(() => expect(result.current.isValid).toBe(true))

		// Act
		rerender({ client: { isFetching: true } })

		// Assert
		expect(result.current).toEqual({ isValid: false })
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
			"redirect_uriが$titleの場合、クライアント情報の取得を待たずにエラーをthrowすること",
			({ redirect_uri }) => {
				// Arrange
				const redirectFail = vi.fn()

				// Act & Assert
				expect(() =>
					renderHook(() =>
						useAuthorizeValidation(
							{ ...validSearchParams, redirect_uri },
							{ isFetching: true },
							redirectFail,
						),
					),
				).toThrow("invalid redirect_uri")
				expect(global.alert).toHaveBeenCalledWith("redirect_uriが不正です")
				expect(redirectFail).not.toHaveBeenCalled()
			},
		)

		it("redirect_uriがクライアントに登録されていない場合、他のパラメータに不備があってもリダイレクトせずにエラーをthrowすること", () => {
			// Arrange
			const redirectFail = vi.fn()

			// Act & Assert
			expect(() =>
				renderHook(() =>
					useAuthorizeValidation(
						{
							...validSearchParams,
							redirect_uri: "https://attacker.test.local/callback",
							state: undefined,
						},
						registeredClient,
						redirectFail,
					),
				),
			).toThrow("invalid redirect_uri")
			expect(global.alert).toHaveBeenCalledWith("redirect_uriが不正です")
			expect(redirectFail).not.toHaveBeenCalled()
		})
	})

	describe("client_idの検証", () => {
		it("クライアント情報の取得に失敗した場合（client_idの未指定・未登録等）、他のパラメータに不備があってもリダイレクトせずにエラーをthrowすること", () => {
			// Arrange
			const redirectFail = vi.fn()

			// Act & Assert
			expect(() =>
				renderHook(() =>
					useAuthorizeValidation(
						{ ...validSearchParams, client_id: undefined, state: undefined },
						{ isSuccess: false, isFetching: false },
						redirectFail,
					),
				),
			).toThrow("invalid client_id")
			expect(global.alert).toHaveBeenCalledWith("client_idが不正です")
			expect(redirectFail).not.toHaveBeenCalled()
		})
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
		])("stateが$titleの場合、redirectFailが呼ばれること", async ({ state }) => {
			// Arrange
			const redirectFail = vi.fn()

			// Act
			const { result } = renderHook(() =>
				useAuthorizeValidation(
					{ ...validSearchParams, state },
					registeredClient,
					redirectFail,
				),
			)

			// Assert
			await waitFor(() =>
				expect(redirectFail).toHaveBeenCalledWith(redirectUri, {
					error: "invalid_request",
					state: undefined,
				}),
			)
			expect(result.current).toEqual({ isValid: false })
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
			async ({ response_type }) => {
				// Arrange
				const redirectFail = vi.fn()

				// Act
				const { result } = renderHook(() =>
					useAuthorizeValidation(
						{ ...validSearchParams, response_type },
						registeredClient,
						redirectFail,
					),
				)

				// Assert
				await waitFor(() =>
					expect(redirectFail).toHaveBeenCalledWith(redirectUri, {
						error: "unsupported_response_type",
						state: "valid_state",
					}),
				)
				expect(result.current).toEqual({ isValid: false })
			},
		)
	})

	describe("scopeの検証", () => {
		it("scopeにクライアントに登録された追加スコープを含む場合、検証が成功すること", async () => {
			// Arrange
			const searchParams = {
				...validSearchParams,
				scope: "openid profile email offline_access example_scope",
			}
			const redirectFail = vi.fn()

			// Act
			const { result } = renderHook(() =>
				useAuthorizeValidation(searchParams, registeredClient, redirectFail),
			)

			// Assert
			await waitFor(() => expect(result.current.isValid).toBe(true))
			expect(redirectFail).not.toHaveBeenCalled()
		})

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
				title: "スペースが連続している",
				scope: "openid  profile",
			},
			{
				title: "先頭がスペース",
				scope: " openid",
			},
			{
				title: "末尾がスペース",
				scope: "openid ",
			},
			{
				title: "スペース以外の空白文字で区切られている",
				scope: "openid\tprofile",
			},
			{
				title: "ダブルクォートを含む",
				scope: 'openid "example"',
			},
			{
				title: "バックスラッシュを含む",
				scope: "openid example\\scope",
			},
			{
				title: "ASCII以外の文字を含む",
				scope: "openid 追加スコープ",
			},
			{
				title: "クライアントに登録されていないスコープを含む",
				scope: "openid unregistered_scope",
			},
		])("scopeが$titleの場合、redirectFailが呼ばれること", async ({ scope }) => {
			// Arrange
			const redirectFail = vi.fn()

			// Act
			const { result } = renderHook(() =>
				useAuthorizeValidation(
					{ ...validSearchParams, scope },
					registeredClient,
					redirectFail,
				),
			)

			// Assert
			await waitFor(() =>
				expect(redirectFail).toHaveBeenCalledWith(redirectUri, {
					error: "invalid_scope",
					state: "valid_state",
				}),
			)
			expect(result.current).toEqual({ isValid: false })
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
		])("nonceが$titleの場合、redirectFailが呼ばれること", async ({ nonce }) => {
			// Arrange
			const redirectFail = vi.fn()

			// Act
			const { result } = renderHook(() =>
				useAuthorizeValidation(
					{ ...validSearchParams, nonce },
					registeredClient,
					redirectFail,
				),
			)

			// Assert
			await waitFor(() =>
				expect(redirectFail).toHaveBeenCalledWith(redirectUri, {
					error: "invalid_request",
					state: "valid_state",
				}),
			)
			expect(result.current).toEqual({ isValid: false })
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
			async ({ code_challenge }) => {
				// Arrange
				const redirectFail = vi.fn()

				// Act
				const { result } = renderHook(() =>
					useAuthorizeValidation(
						{ ...validSearchParams, code_challenge },
						registeredClient,
						redirectFail,
					),
				)

				// Assert
				await waitFor(() =>
					expect(redirectFail).toHaveBeenCalledWith(redirectUri, {
						error: "invalid_request",
						state: "valid_state",
					}),
				)
				expect(result.current).toEqual({ isValid: false })
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
			async ({ code_challenge_method }) => {
				// Arrange
				const redirectFail = vi.fn()

				// Act
				const { result } = renderHook(() =>
					useAuthorizeValidation(
						{ ...validSearchParams, code_challenge_method },
						registeredClient,
						redirectFail,
					),
				)

				// Assert
				await waitFor(() =>
					expect(redirectFail).toHaveBeenCalledWith(redirectUri, {
						error: "invalid_request",
						state: "valid_state",
					}),
				)
				expect(result.current).toEqual({ isValid: false })
			},
		)
	})
})
