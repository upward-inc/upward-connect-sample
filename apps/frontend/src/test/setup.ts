import "@testing-library/jest-dom/vitest"

import { server } from "./msw"

beforeAll(() => {
	server.listen()
})

afterEach(() => {
	server.resetHandlers()
})

afterAll(() => {
	server.close()
})
