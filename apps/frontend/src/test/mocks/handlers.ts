import { type HttpHandler, HttpResponse, http } from "msw"

export const createClientHandler = async (
	mockApiUrl: string,
	status: number,
	body: Record<string, unknown>,
	clientId = ":clientId",
	delayMs = 0,
): Promise<HttpHandler> => {
	await new Promise((resolve) => setTimeout(resolve, delayMs))
	return http.get(`${mockApiUrl}/auth/clients/${clientId}`, () =>
		HttpResponse.json(body, { status }),
	)
}

export const createAuthorizeHandler = (
	mockApiUrl: string,
	status: number,
	body: Record<string, unknown>,
): HttpHandler => {
	return http.post(`${mockApiUrl}/auth/authorize`, async () => {
		return HttpResponse.json(body, { status })
	})
}
