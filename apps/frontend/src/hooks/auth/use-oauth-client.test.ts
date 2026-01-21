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
	beforeEach(() => {
		setRequestHandlers(
			createClientHandler(API_URL, 200, { name: "Sample App" }),
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
			createClientHandler(API_URL, 404, { error: "Client not found" }),
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
			createClientHandler(API_URL, 401, { error: "Unauthorized" }),
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
})
