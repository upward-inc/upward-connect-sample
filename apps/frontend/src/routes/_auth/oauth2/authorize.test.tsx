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

let locationUpdates: string[] = []

const createClientHandler = (
	body: Record<string, unknown>,
	status = 200,
): HttpHandler => {
	return http.get(`${API_URL}/auth/clients/:clientId`, () =>
		HttpResponse.json(body, { status }),
	)
}

const createAuthorizeHandler = (
	status: number,
	body: Record<string, unknown>,
	options: { onRequest?: (request: Request) => void } = {},
): HttpHandler => {
	return http.post(`${API_URL}/auth/authorize`, async ({ request }) => {
		options.onRequest?.(request)
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

		locationHref = baseSearchParams.redirect_uri
		locationUpdates = []
		Object.defineProperty(window, "location", {
			configurable: true,
			value: {
				assign: vi.fn(),
				replace: vi.fn(),
				reload: vi.fn(),
				get href() {
					return locationHref
				},
				set href(value: string) {
					locationUpdates.push(value)
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
		setRequestHandlers(createClientHandler({ name: "Sample App" }))
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
		const authorizeRequest = vi.fn()
		setRequestHandlers(
			createClientHandler({ name: "Sample App" }),
			createAuthorizeHandler(
				200,
				{
					code: "AUTH_CODE",
					state: baseSearchParams.state,
				},
				{ onRequest: authorizeRequest },
			),
		)

		renderAuthorizePage()
		const user = userEvent.setup()

		await user.click(await screen.findByRole("button", { name: "許可する" }))

		await waitFor(() => {
			expect(authorizeRequest).toHaveBeenCalledTimes(1)
		})

		await waitFor(() => {
			const redirectedUrl = locationUpdates.find((value) =>
				value.includes("code=AUTH_CODE"),
			)
			expect(redirectedUrl).toBeDefined()
			expect(redirectedUrl).toContain(`state=${baseSearchParams.state}`)
			expect(redirectedUrl).not.toContain("error=")
		})
	})

	it("ユーザーが拒否ボタンをクリックしたとき、access_deniedエラーとstateパラメータを付与してリダイレクトURIへ遷移する", async () => {
		setRequestHandlers(createClientHandler({ name: "Sample App" }))

		renderAuthorizePage()
		const user = userEvent.setup()

		await user.click(await screen.findByRole("button", { name: "拒否する" }))

		expect(locationHref).toContain("error=access_denied")
		expect(locationHref).toContain(`state=${baseSearchParams.state}`)
	})

	it("クライアント情報の取得に失敗したとき、unauthorized_clientエラーを付与してリダイレクトURIへ遷移する", async () => {
		setRequestHandlers(createClientHandler({}, 404))

		renderAuthorizePage()

		await waitFor(() => {
			expect(locationHref).toContain("error=unauthorized_client")
		})
	})

	it("認可APIがinvalid_request_uriエラーを返したとき、オープンリダイレクト攻撃を防ぐため例外を投げる", async () => {
		setRequestHandlers(
			createClientHandler({ name: "Sample App" }),
			http.post(`${API_URL}/auth/authorize`, () =>
				HttpResponse.json({ error: "invalid_request_uri" }, { status: 400 }),
			),
		)

		renderAuthorizePage()
		const user = userEvent.setup()
		const authorizeButton = await screen.findByRole("button", {
			name: "許可する",
		})

		const rejectionHandler = vi.fn()
		const listener = (reason: unknown) => {
			rejectionHandler(reason)
		}
		process.on("unhandledRejection", listener)

		try {
			await user.click(authorizeButton)

			await waitFor(() => {
				expect(rejectionHandler).toHaveBeenCalled()
				const [reason] = rejectionHandler.mock.calls[0]
				expect(reason).toBeInstanceOf(Error)
				expect((reason as Error).message).toBe("invalid redirect_uri")
			})
		} finally {
			process.off("unhandledRejection", listener)
		}
	})

	it("認可APIがconsent_requiredエラーを返したとき、エラーとエラー説明とstateパラメータを付与してリダイレクトURIへ遷移する", async () => {
		setRequestHandlers(
			createClientHandler({ name: "Sample App" }),
			createAuthorizeHandler(400, {
				error: "consent_required",
				error_description: "consent required",
				state: baseSearchParams.state,
			}),
		)

		renderAuthorizePage()
		const user = userEvent.setup()

		await user.click(await screen.findByRole("button", { name: "許可する" }))

		expect(locationHref).toContain("error=consent_required")
		expect(locationHref).toContain(`state=${baseSearchParams.state}`)
		expect(locationHref).toContain("error_description=consent+required")
	})

	it("認可APIが503ステータスを返したとき、temporarily_unavailableエラーを付与してリダイレクトURIへ遷移する", async () => {
		setRequestHandlers(
			createClientHandler({ name: "Sample App" }),
			createAuthorizeHandler(503, { error: "server_error" }),
		)

		renderAuthorizePage()
		const user = userEvent.setup()

		await user.click(await screen.findByRole("button", { name: "許可する" }))

		expect(locationHref).toContain("error=temporarily_unavailable")
	})
})
