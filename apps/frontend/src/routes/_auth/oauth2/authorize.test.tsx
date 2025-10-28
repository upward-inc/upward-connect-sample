import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import type { HttpHandler } from "msw"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { setRequestHandlers } from "../../../test/msw"
import { AuthorizePage, type SearchParams } from "./authorize"

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

const { useAuthMock } = vi.hoisted(() => ({
	useAuthMock: vi.fn(),
}))
vi.mock("../../../auth", () => ({
	useAuth: useAuthMock,
}))

const baseSearchParams: Required<SearchParams> = {
	response_type: "code",
	client_id: "client-123",
	redirect_uri: "https://client.example.com/callback",
	scope: "openid profile",
	state: "state-xyz",
	nonce: "nonce-value",
	code_challenge: "a".repeat(43),
	code_challenge_method: "S256",
}

const createClientHandler = (
	status: number,
	body: Record<string, unknown>,
): HttpHandler => {
	return http.get(`${API_URL}/auth/clients/:clientId`, () =>
		HttpResponse.json(body, { status }),
	)
}

const createAuthorizeHandler = (
	status: number,
	body: Record<string, unknown>,
): HttpHandler => {
	return http.post(`${API_URL}/auth/authorize`, async () => {
		return HttpResponse.json(body, { status })
	})
}

const renderAuthorizePage = () => {
	render(<AuthorizePage />)
}

describe("AuthorizePage", () => {
	const originalLocation = window.location
	let locationHref = baseSearchParams.redirect_uri

	beforeEach(() => {
		useSearchMock.mockReturnValue(baseSearchParams)
		useAuthMock.mockReturnValue({ token: "test-token" })

		setRequestHandlers(
			createClientHandler(200, { name: "Sample App" }),
			createAuthorizeHandler(200, {
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
		useAuthMock.mockReset()
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
		setRequestHandlers(createClientHandler(404, {}))

		renderAuthorizePage()

		await waitFor(() => {
			expect(locationHref).toBe(
				`${baseSearchParams.redirect_uri}?error=unauthorized_client&state=${baseSearchParams.state}`,
			)
		})
	})

	it("認可APIがinvalid_request_uriエラーを返したとき、オープンリダイレクト攻撃を防ぐため例外を投げる", async () => {
		setRequestHandlers(
			http.post(`${API_URL}/auth/authorize`, () =>
				HttpResponse.json({ error: "invalid_request_uri" }, { status: 400 }),
			),
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
			createAuthorizeHandler(400, {
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
		setRequestHandlers(createAuthorizeHandler(503, { error: "server_error" }))

		renderAuthorizePage()
		const user = userEvent.setup()

		await user.click(await screen.findByRole("button", { name: "許可する" }))

		expect(locationHref).toBe(
			`${baseSearchParams.redirect_uri}?error=temporarily_unavailable`,
		)
	})
})
