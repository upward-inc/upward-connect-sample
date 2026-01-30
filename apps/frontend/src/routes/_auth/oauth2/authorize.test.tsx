import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { SearchParams } from "../../../schema/auth"
import {
	createAuthorizeHandler,
	createClientHandler,
} from "../../../test/mocks/handlers"
import { setRequestHandlers } from "../../../test/mocks/server"
import { AuthorizePage } from "./authorize"

const { API_URL } = vi.hoisted(() => ({
	API_URL: "https://api.test.local",
}))
vi.mock("../../../env", () => ({
	env: { API_URL },
}))

const { useSearchMock, createFileRouteMock } = vi.hoisted(() => ({
	useSearchMock: vi.fn(),
	createFileRouteMock: vi.fn().mockImplementation(() => () => ({})),
}))
vi.mock("@tanstack/react-router", () => ({
	useSearch: useSearchMock,
	createFileRoute: createFileRouteMock,
}))

const baseSearchParams: Required<SearchParams> = {
	response_type: "code",
	client_id: "client-123",
	redirect_uri: "https://client.example.com/callback",
	scope: "openid profile email offline_access",
	state: "state-value",
	nonce: "nonce-value",
	code_challenge: "a".repeat(43),
	code_challenge_method: "S256",
}

const renderAuthorizePage = () => {
	render(<AuthorizePage />)
}

describe("AuthorizePage", () => {
	const originalLocation = window.location
	let locationHref = baseSearchParams.redirect_uri

	beforeEach(async () => {
		useSearchMock.mockReturnValue(baseSearchParams)

		setRequestHandlers(
			await createClientHandler(API_URL, 200, { name: "Sample App" }),
			createAuthorizeHandler(API_URL, 200, {
				code: "AUTH_CODE",
				state: baseSearchParams.state,
			}),
		)

		locationHref = baseSearchParams.redirect_uri
		Object.defineProperty(window, "location", {
			configurable: true,
			value: {
				get href() {
					return locationHref
				},
				set href(value: string) {
					locationHref = value
				},
			},
		})
	})

	afterEach(() => {
		useSearchMock.mockReset()
		createFileRouteMock.mockReset()
		Object.defineProperty(window, "location", {
			configurable: true,
			value: originalLocation,
		})
	})

	it("有効なOAuthパラメータとクライアントIDでアクセスしたとき、クライアント名と要求されたスコープのリストが表示される", async () => {
		renderAuthorizePage()

		await waitFor(() => {
			expect(
				screen.getByText(
					"「Sample App」が以下のスコープへのアクセスを要求しています",
				),
			).toBeVisible()
		})
		expect(screen.getByText("openid（IDトークン発行）")).toBeVisible()
		expect(screen.getByText("profile（プロフィール情報）")).toBeVisible()
		expect(screen.getByText("email（メールアドレス）")).toBeVisible()
		expect(
			screen.getByText("offline_access（リフレッシュトークン発行）"),
		).toBeVisible()
	})

	it("ユーザーが許可ボタンをクリックしたとき、認可コードとstateパラメータを付与してリダイレクトURIへ遷移する", async () => {
		renderAuthorizePage()
		const user = userEvent.setup()
		await user.click(await screen.findByRole("button", { name: "許可する" }))

		await waitFor(() => {
			expect(locationHref).toBe(
				`${baseSearchParams.redirect_uri}?code=AUTH_CODE&state=${baseSearchParams.state}`,
			)
		})
	})

	it("ユーザーが拒否ボタンをクリックしたとき、access_deniedエラーとstateパラメータを付与してリダイレクトURIへ遷移する", async () => {
		renderAuthorizePage()
		const user = userEvent.setup()

		await user.click(await screen.findByRole("button", { name: "拒否する" }))

		expect(locationHref).toBe(
			`${baseSearchParams.redirect_uri}?error=access_denied&state=${baseSearchParams.state}`,
		)
	})

	it("クライアント情報の取得に失敗したとき、unauthorized_clientエラーを付与してリダイレクトURIへ遷移する", async () => {
		// クライアント情報の取得に失敗するように上書き
		setRequestHandlers(await createClientHandler(API_URL, 404, {}))

		renderAuthorizePage()

		await waitFor(() => {
			expect(locationHref).toBe(
				`${baseSearchParams.redirect_uri}?error=unauthorized_client&state=${baseSearchParams.state}`,
			)
		})
	})

	it("認可APIがinvalid_request_uriエラーを返したとき、オープンリダイレクト攻撃を防ぐため例外を投げる", async () => {
		setRequestHandlers(
			createAuthorizeHandler(API_URL, 400, { error: "invalid_request_uri" }),
		)

		renderAuthorizePage()

		const user = userEvent.setup()
		const authorizeButton = await screen.findByRole("button", {
			name: "許可する",
		})

		// エラーハンドリングを適切に処理
		const errorPromise = new Promise<Error>((resolve) => {
			const listener = (reason: unknown) => {
				if (
					reason instanceof Error &&
					reason.message === "invalid redirect_uri"
				) {
					process.off("unhandledRejection", listener)
					resolve(reason)
				}
			}
			process.on("unhandledRejection", listener)
		})

		await user.click(authorizeButton)

		const thrownError = await errorPromise
		expect(thrownError.message).toBe("invalid redirect_uri")
	})

	it("認可APIがconsent_requiredエラーを返したとき、エラーとエラー説明とstateパラメータを付与してリダイレクトURIへ遷移する", async () => {
		// ユーザーの同意が必要である旨のエラーを返すように上書き
		setRequestHandlers(
			createAuthorizeHandler(API_URL, 400, {
				error: "consent_required",
				error_description: "consent required",
				state: baseSearchParams.state,
			}),
		)

		renderAuthorizePage()
		const user = userEvent.setup()

		await user.click(await screen.findByRole("button", { name: "許可する" }))

		expect(locationHref).toBe(
			`${baseSearchParams.redirect_uri}?error=consent_required&error_description=consent+required&state=${baseSearchParams.state}`,
		)
	})

	it("認可APIが503ステータスを返したとき、temporarily_unavailableエラーを付与してリダイレクトURIへ遷移する", async () => {
		// サーバーエラーを返すように上書き
		setRequestHandlers(createAuthorizeHandler(API_URL, 503, {}))

		renderAuthorizePage()
		const user = userEvent.setup()

		await user.click(await screen.findByRole("button", { name: "許可する" }))

		expect(locationHref).toBe(
			`${baseSearchParams.redirect_uri}?error=temporarily_unavailable`,
		)
	})

	describe("不正パラメータの場合に適切なエラーでリダイレクトされること", () => {
		it("redirect_uriが未指定のとき、オープンリダイレクト攻撃を防ぐため例外を投げる", () => {
			// redirect_uriを未指定にする
			useSearchMock.mockReturnValue({
				...baseSearchParams,
				redirect_uri: undefined,
			})

			// コンポーネントのレンダリングで例外がスローされることを期待
			expect(() => renderAuthorizePage()).toThrow("invalid redirect_uri")
		})

		it("client_idが未指定のとき、unauthorized_clientエラーとstateパラメータを付与してリダイレクトURIへ遷移する", () => {
			// client_idを未指定にする
			useSearchMock.mockReturnValue({
				...baseSearchParams,
				client_id: undefined,
			})

			// 本来location.hrefでリダイレクトが発生するが、テスト環境ではモックしておりZodErrorがスローされるためtry-catchで捕捉
			try {
				renderAuthorizePage()
			} catch {}

			expect(locationHref).toBe(
				`${baseSearchParams.redirect_uri}?error=unauthorized_client&state=${baseSearchParams.state}`,
			)
		})

		it.each([
			{
				title: "scopeが未指定",
				paramKey: "scope",
				expectedUrl: `${baseSearchParams.redirect_uri}?error=invalid_scope&state=${baseSearchParams.state}`,
			},
			{
				title: "stateが未指定",
				paramKey: "state",
				expectedUrl: `${baseSearchParams.redirect_uri}?error=invalid_request`,
			},
			{
				title: "nonceが未指定",
				paramKey: "nonce",
				expectedUrl: `${baseSearchParams.redirect_uri}?error=invalid_request&state=${baseSearchParams.state}`,
			},
			{
				title: "code_challengeが未指定",
				paramKey: "code_challenge",
				expectedUrl: `${baseSearchParams.redirect_uri}?error=invalid_request&state=${baseSearchParams.state}`,
			},
		])(
			"$titleの場合、適切なエラーを付与してリダイレクトURIへ遷移する",
			async ({ paramKey, expectedUrl }) => {
				// 該当パラメータを未指定にする
				useSearchMock.mockReturnValue({
					...baseSearchParams,
					[paramKey]: undefined,
				})

				renderAuthorizePage()

				expect(locationHref).toBe(expectedUrl)
			},
		)
	})
})
