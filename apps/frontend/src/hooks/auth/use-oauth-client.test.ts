import { renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import { createClientHandler } from "../../test/mocks/handlers"
import { setRequestHandlers } from "../../test/mocks/server"
import { useOAuthClient } from "./use-oauth-client"

const { API_URL } = vi.hoisted(() => ({
	API_URL: "https://api.test.local",
}))
vi.mock("../../env", () => ({
	env: { API_URL },
}))

describe("useOAuthClient", () => {
	beforeEach(async () => {
		setRequestHandlers(
			await createClientHandler(API_URL, 200, {
				id: "valid_client_id",
				name: "Sample App",
				scopes: ["openid", "profile", "email", "offline_access"],
				redirect_uris: ["https://client.test.local/callback"],
			}),
		)
	})

	it("有効なclient_idでクライアント情報を正しく取得できること", async () => {
		// Arrange
		const clientId = "valid_client_id"

		// Act
		const { result } = renderHook(() => useOAuthClient(clientId))

		// Assert
		await waitFor(() =>
			expect(result.current).toEqual({
				isSuccess: true,
				isFetching: false,
				client: {
					id: "valid_client_id",
					name: "Sample App",
					scopes: ["openid", "profile", "email", "offline_access"],
					redirect_uris: ["https://client.test.local/callback"],
				},
			}),
		)
	})

	it.each([
		{
			title: "スコープ",
			body: {
				id: "valid_client_id",
				name: "Sample App",
				redirect_uris: ["https://client.test.local/callback"],
			},
		},
		{
			title: "リダイレクトURI",
			body: { id: "valid_client_id", name: "Sample App", scopes: ["openid"] },
		},
	])("応答に$titleが含まれない場合はエラーとなること", async ({ body }) => {
		// Arrange
		const clientId = "valid_client_id"
		setRequestHandlers(await createClientHandler(API_URL, 200, body))

		// Act
		const { result } = renderHook(() => useOAuthClient(clientId))

		// Assert
		await waitFor(() =>
			expect(result.current).toEqual({
				isSuccess: false,
				isFetching: false,
			}),
		)
	})

	it("応答のクライアントIDがclient_idと一致しない場合はエラーとなること", async () => {
		// Arrange
		const clientId = "valid_client_id"
		setRequestHandlers(
			await createClientHandler(API_URL, 200, {
				id: "other_client_id",
				name: "Other App",
				scopes: ["openid"],
				redirect_uris: ["https://other.test.local/callback"],
			}),
		)

		// Act
		const { result } = renderHook(() => useOAuthClient(clientId))

		// Assert
		await waitFor(() =>
			expect(result.current).toEqual({
				isSuccess: false,
				isFetching: false,
			}),
		)
	})

	it("client_idにURLの区切り文字を含む場合、エンコードしたclient_idのクライアント情報を取得すること", async () => {
		// Arrange
		// エンコードしない場合は `?` 以降がクエリとなり、`abc` のクライアント情報を取得してしまう
		const clientId = "abc?x"
		setRequestHandlers(
			http.get(`${API_URL}/auth/clients/:clientId`, ({ params }) =>
				HttpResponse.json({
					id: params.clientId,
					name: "Sample App",
					scopes: ["openid"],
					redirect_uris: ["https://client.test.local/callback"],
				}),
			),
		)

		// Act
		const { result } = renderHook(() => useOAuthClient(clientId))

		// Assert
		await waitFor(() =>
			expect(result.current).toEqual({
				isSuccess: true,
				isFetching: false,
				client: {
					id: clientId,
					name: "Sample App",
					scopes: ["openid"],
					redirect_uris: ["https://client.test.local/callback"],
				},
			}),
		)
	})

	it.each([
		{
			title: "通信エラーとなった",
			handler: http.get(`${API_URL}/auth/clients/:clientId`, () =>
				HttpResponse.error(),
			),
		},
		{
			title: "応答がJSONでない",
			handler: http.get(
				`${API_URL}/auth/clients/:clientId`,
				() => new HttpResponse("<html></html>", { status: 502 }),
			),
		},
	])("取得が$title場合はエラーとなること", async ({ handler }) => {
		// Arrange
		setRequestHandlers(handler)

		// Act
		const { result } = renderHook(() => useOAuthClient("valid_client_id"))

		// Assert
		await waitFor(() =>
			expect(result.current).toEqual({
				isSuccess: false,
				isFetching: false,
			}),
		)
	})

	it("無効なclient_idの場合はエラーとなること", async () => {
		// Arrange
		const clientId = "invalid_client_id"
		setRequestHandlers(
			await createClientHandler(API_URL, 404, { error: "Client not found" }),
		)

		// Act
		const { result } = renderHook(() => useOAuthClient(clientId))

		// Assert
		await waitFor(() =>
			expect(result.current).toEqual({
				isSuccess: false,
				isFetching: false,
			}),
		)
	})

	it("sessionが切れた場合はエラーとなること", async () => {
		// Arrange
		const clientId = "valid_client_id"
		setRequestHandlers(
			await createClientHandler(API_URL, 401, { error: "Unauthorized" }),
		)

		// Act
		const { result } = renderHook(() => useOAuthClient(clientId))

		// Assert
		await waitFor(() =>
			expect(result.current).toEqual({
				isSuccess: false,
				isFetching: false,
			}),
		)
	})

	it("client_idが未指定の場合はクライアント情報を取得せずにエラーとなること", async () => {
		// Act
		const { result } = renderHook(() => useOAuthClient(undefined))

		// Assert
		await waitFor(() =>
			expect(result.current).toEqual({
				isSuccess: false,
				isFetching: false,
			}),
		)
	})

	it("フェッチ中にclientIdが変更された場合、最新のclientIdの結果が表示されること", async () => {
		// Arrange
		const firstClientId = "client_1"
		const secondClientId = "client_2"

		// 最初のリクエストに遅延を追加
		setRequestHandlers(
			await createClientHandler(
				API_URL,
				200,
				{
					id: firstClientId,
					name: "First Client",
					scopes: ["openid"],
					redirect_uris: ["https://first.test.local/callback"],
				},
				firstClientId,
				100,
			),
			await createClientHandler(
				API_URL,
				200,
				{
					id: secondClientId,
					name: "Second Client",
					scopes: ["openid", "profile"],
					redirect_uris: ["https://second.test.local/callback"],
				},
				secondClientId,
			),
		)

		// Act
		const { result, rerender } = renderHook(
			({ clientId }) => useOAuthClient(clientId),
			{ initialProps: { clientId: firstClientId } },
		)

		// 最初のフェッチが完了する前に clientId を変更
		rerender({ clientId: secondClientId })

		// Assert
		// 最新の clientId（secondClientId）の結果が表示されることを確認
		await waitFor(() =>
			expect(result.current).toEqual({
				isSuccess: true,
				isFetching: false,
				client: {
					id: secondClientId,
					name: "Second Client",
					scopes: ["openid", "profile"],
					redirect_uris: ["https://second.test.local/callback"],
				},
			}),
		)
	})

	it("取得に成功したあとclient_idが変わった場合、変更直後は取得中となり、新しいclient_idの取得に失敗したらエラーとなること", async () => {
		// Arrange
		const firstClientId = "client_1"
		const secondClientId = "client_2"
		setRequestHandlers(
			await createClientHandler(
				API_URL,
				200,
				{
					id: firstClientId,
					name: "First Client",
					scopes: ["openid"],
					redirect_uris: ["https://first.test.local/callback"],
				},
				firstClientId,
			),
			await createClientHandler(API_URL, 404, {}, secondClientId),
		)
		const { result, rerender } = renderHook(
			({ clientId }) => useOAuthClient(clientId),
			{ initialProps: { clientId: firstClientId } },
		)
		await waitFor(() => expect(result.current.isFetching).toBe(false))

		// Act
		rerender({ clientId: secondClientId })

		// Assert
		// 前のクライアント情報を返さないこと
		expect(result.current).toEqual({ isFetching: true })
		await waitFor(() =>
			expect(result.current).toEqual({
				isSuccess: false,
				isFetching: false,
			}),
		)
	})

	it("フェッチ中にコンポーネントがアンマウントされた場合、メモリリーク警告が発生しないこと", async () => {
		// Arrange
		const clientId = "valid_client_id"

		// リクエストに遅延を追加
		setRequestHandlers(
			await createClientHandler(
				API_URL,
				200,
				{
					id: clientId,
					name: "Sample App",
					scopes: ["openid"],
					redirect_uris: ["https://client.test.local/callback"],
				},
				clientId,
				100,
			),
		)

		// console.error をモックして警告をキャッチ
		const consoleErrorSpy = vi.spyOn(console, "error")

		// Act
		const { unmount } = renderHook(() => useOAuthClient(clientId))

		// フェッチが完了する前にコンポーネントをアンマウント
		unmount()

		// Assert
		// 少し待って、遅延したリクエストが完了する時間を与える
		await new Promise((resolve) => setTimeout(resolve, 150))
		expect(consoleErrorSpy).not.toHaveBeenCalled()

		// console.error のモックを元に戻す
		consoleErrorSpy.mockRestore()
	})
})
