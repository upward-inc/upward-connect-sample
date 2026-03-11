import { renderHook, waitFor } from "@testing-library/react"
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
			await createClientHandler(API_URL, 200, { name: "Sample App" }),
		)
	})

	it("有効なclient_idでクライアント情報を正しく取得できること", async () => {
		// Arrange
		const clientId = "valid_client_id"

		// Act
		const { result } = renderHook(() => useOAuthClient(false, clientId))

		// Assert
		await waitFor(() =>
			expect(result.current).toEqual({
				isSuccess: true,
				name: "Sample App",
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
		const { result } = renderHook(() => useOAuthClient(false, clientId))

		// Assert
		await waitFor(() =>
			expect(result.current).toEqual({
				isSuccess: false,
				error: "unauthorized_client",
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
		const { result } = renderHook(() => useOAuthClient(false, clientId))

		// Assert
		await waitFor(() =>
			expect(result.current).toEqual({
				isSuccess: false,
				error: "unauthorized_client",
				isFetching: false,
			}),
		)
	})

	it("isValidatingがtrueの場合はクライアント情報を取得しないこと", async () => {
		// Arrange
		const clientId = "valid_client_id"

		// Act
		const { result } = renderHook(() => useOAuthClient(true, clientId))

		// Assert
		expect(result.current).toEqual({ isFetching: true })
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
				{ name: "First Client" },
				firstClientId,
				100,
			),
			await createClientHandler(
				API_URL,
				200,
				{ name: "Second Client" },
				secondClientId,
			),
		)

		// Act
		const { result, rerender } = renderHook(
			({ clientId }) => useOAuthClient(false, clientId),
			{ initialProps: { clientId: firstClientId } },
		)

		// 最初のフェッチが完了する前に clientId を変更
		rerender({ clientId: secondClientId })

		// Assert
		// 最新の clientId（secondClientId）の結果が表示されることを確認
		await waitFor(() =>
			expect(result.current).toEqual({
				isSuccess: true,
				name: "Second Client",
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
				{ name: "Sample App" },
				clientId,
				100,
			),
		)

		// console.error をモックして警告をキャッチ
		const consoleErrorSpy = vi.spyOn(console, "error")

		// Act
		const { unmount } = renderHook(() => useOAuthClient(false, clientId))

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
