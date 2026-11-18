import { describe, expect, it } from "vitest"
import { hasOnlyRegisteredScopes } from "./auth"

describe("hasOnlyRegisteredScopes", () => {
	const registeredScopes = [
		"openid",
		"profile",
		"email",
		"offline_access",
		"example_scope",
	]

	it.each([
		{
			title: "既定のスコープのみ",
			scope: "openid profile email offline_access",
		},
		{
			title: "登録済みの追加スコープを含む",
			scope: "openid profile email offline_access example_scope",
		},
		{
			title: "登録済みスコープの一部のみ",
			scope: "openid",
		},
	])("要求スコープが$titleの場合、trueを返すこと", ({ scope }) => {
		expect(hasOnlyRegisteredScopes(scope, registeredScopes)).toBe(true)
	})

	it.each([
		{
			title: "未登録のスコープを含む",
			scope: "openid profile unregistered_scope",
		},
		{
			title: "未登録のスコープのみ",
			scope: "unregistered_scope",
		},
	])("要求スコープが$titleの場合、falseを返すこと", ({ scope }) => {
		expect(hasOnlyRegisteredScopes(scope, registeredScopes)).toBe(false)
	})
})
