import { http, type HttpHandler, HttpResponse } from "msw"

export const createClientHandler = (
	mockApiUrl: string,
	status: number,
	body: Record<string, unknown>,
): HttpHandler => {
	return http.get(`${mockApiUrl}/auth/clients/:clientId`, () =>
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
