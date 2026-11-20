import { describe, expect, test } from "bun:test"

import {
	assertSubmitted,
	buildResolved,
	buildSnapshot,
	type Lockfile,
	parseLockfile,
} from "./submit-bun-lock-dependencies"

const lockfile: Lockfile = {
	lockfileVersion: 2,
	workspaces: {
		"": {
			name: "root",
			devDependencies: {
				tool: "^1.0.0",
				shared: "^1.0.0",
				"@scope/x": "^1.0.0",
			},
		},
		"apps/a": {
			name: "@repo/a",
			dependencies: {
				"@scope/lib": "^1.0.0",
				"@repo/b": "workspace:*",
				shared: "^2.0.0",
			},
		},
	},
	packages: {
		"@repo/a": ["@repo/a@workspace:apps/a"],
		"@repo/b": ["@repo/b@workspace:apps/b"],
		"@repo/a/shared": ["shared@2.0.0", "", {}, "sha512-shared2"],
		"@scope/lib": [
			"@scope/lib@1.0.0",
			"",
			{ dependencies: { dep: "^2.0.0", inner: "^1.0.0", common: "^1.0.0" } },
			"sha512-lib",
		],
		"@scope/lib/inner": [
			"inner@1.0.0",
			"",
			{ dependencies: { x: "^1.0.0" } },
			"sha512-inner",
		],
		"@scope/lib/common": ["common@1.0.0", "", {}, "sha512-common"],
		"@scope/x": ["@scope/x@1.0.0", "", {}, "sha512-scope-x"],
		x: ["x@1.0.0", "", {}, "sha512-x"],
		dep: [
			"dep@2.0.0",
			"",
			{
				optionalDependencies: { leaf: "^2.0.0" },
				peerDependencies: { peer: "*", "only-dev": "*" },
				optionalPeers: ["only-dev"],
			},
			"sha512-dep2",
		],
		peer: ["peer@1.0.0", "", {}, "sha512-peer"],
		"only-dev": ["only-dev@1.0.0", "", {}, "sha512-only-dev"],
		leaf: ["leaf@2.0.0", "", {}, "sha512-leaf2"],
		shared: ["shared@1.0.0", "", {}, "sha512-shared1"],
		tool: [
			"tool@1.0.0",
			"",
			{
				dependencies: { dep: "^1.0.0", common: "^1.0.0", "only-dev": "^1.0.0" },
			},
			"sha512-tool",
		],
		"tool/dep": [
			"dep@1.0.0",
			"",
			{ dependencies: { leaf: "^1.0.0" } },
			"sha512-dep1",
		],
		"tool/leaf": ["leaf@1.0.0", "", {}, "sha512-leaf1"],
		"tool/common": ["common@1.0.0", "", {}, "sha512-common"],
	},
}

describe("buildResolved", () => {
	test("workspace のパッケージは含めない", () => {
		const resolved = buildResolved(lockfile)

		expect(
			Object.keys(resolved).filter((purl) => {
				return purl.includes("repo")
			}),
		).toStrictEqual([])
	})

	test("scoped パッケージの purl は @ を %40 にエンコードする", () => {
		const resolved = buildResolved(lockfile)

		expect(resolved["pkg:npm/%40scope/lib@1.0.0"]?.package_url).toBe(
			"pkg:npm/%40scope/lib@1.0.0",
		)
	})

	test("purl のバージョンに含まれる + をエンコードする", () => {
		const resolved = buildResolved({
			lockfileVersion: 2,
			workspaces: { "": { name: "root", dependencies: { a: "^1.0.0" } } },
			packages: { a: ["a@1.0.0+build.1", "", {}, "sha512-a"] },
		})

		expect(Object.keys(resolved)).toStrictEqual(["pkg:npm/a@1.0.0%2Bbuild.1"])
	})

	test("workspace が宣言した依存は direct、それ以外は indirect にする", () => {
		const resolved = buildResolved(lockfile)

		expect(resolved["pkg:npm/%40scope/lib@1.0.0"]?.relationship).toBe("direct")
		expect(resolved["pkg:npm/tool@1.0.0"]?.relationship).toBe("direct")
		expect(resolved["pkg:npm/dep@2.0.0"]?.relationship).toBe("indirect")
	})

	test("dependencies から辿れるものは runtime、devDependencies からしか辿れないものは development にする", () => {
		const resolved = buildResolved(lockfile)

		expect(resolved["pkg:npm/dep@2.0.0"]?.scope).toBe("runtime")
		expect(resolved["pkg:npm/dep@1.0.0"]?.scope).toBe("development")
	})

	test("workspace ごとに異なるバージョンは、その workspace の配下から解決する", () => {
		const resolved = buildResolved(lockfile)

		expect(resolved["pkg:npm/shared@2.0.0"]).toMatchObject({
			relationship: "direct",
			scope: "runtime",
		})
		expect(resolved["pkg:npm/shared@1.0.0"]).toMatchObject({
			relationship: "direct",
			scope: "development",
		})
	})

	test("ネストした配置の依存は、自身の配下から親へ遡って解決する", () => {
		const resolved = buildResolved(lockfile)

		expect(resolved["pkg:npm/tool@1.0.0"]?.dependencies).toContain(
			"pkg:npm/dep@1.0.0",
		)
		expect(resolved["pkg:npm/dep@1.0.0"]?.dependencies).toStrictEqual([
			"pkg:npm/leaf@1.0.0",
		])
		expect(resolved["pkg:npm/leaf@1.0.0"]?.scope).toBe("development")
		expect(resolved["pkg:npm/leaf@2.0.0"]?.scope).toBe("runtime")
	})

	test("scope 付きの名前を含む配置から遡るとき、scope だけの階層を候補にしない", () => {
		const resolved = buildResolved(lockfile)

		expect(resolved["pkg:npm/inner@1.0.0"]?.dependencies).toStrictEqual([
			"pkg:npm/x@1.0.0",
		])
	})

	test("同じ name@version が複数の配置に現れたときは、runtime を優先して 1 つにまとめる", () => {
		const resolved = buildResolved(lockfile)

		expect(resolved["pkg:npm/common@1.0.0"]).toStrictEqual({
			package_url: "pkg:npm/common@1.0.0",
			relationship: "indirect",
			scope: "runtime",
			dependencies: [],
		})
	})

	test("peer は辿り、optional peer は辿らない", () => {
		const resolved = buildResolved(lockfile)

		expect(resolved["pkg:npm/dep@2.0.0"]?.dependencies).toStrictEqual([
			"pkg:npm/leaf@2.0.0",
			"pkg:npm/peer@1.0.0",
		])
		expect(resolved["pkg:npm/peer@1.0.0"]?.scope).toBe("runtime")
		expect(resolved["pkg:npm/only-dev@1.0.0"]?.scope).toBe("development")
	})

	test("optional peer でも、自身の配下に置かれたものは辿る", () => {
		const resolved = buildResolved({
			lockfileVersion: 2,
			workspaces: { "": { name: "root", devDependencies: { a: "^1.0.0" } } },
			packages: {
				a: [
					"a@1.0.0",
					"",
					{
						peerDependencies: { typescript: "*" },
						optionalPeers: ["typescript"],
					},
					"sha512-a",
				],
				"a/typescript": ["typescript@6.0.2", "", {}, "sha512-ts"],
			},
		})

		expect(resolved["pkg:npm/a@1.0.0"]?.dependencies).toStrictEqual([
			"pkg:npm/typescript@6.0.2",
		])
		expect(resolved["pkg:npm/typescript@6.0.2"]?.scope).toBe("development")
	})

	test("lockfile に無い peer は飛ばす", () => {
		const resolved = buildResolved({
			lockfileVersion: 2,
			workspaces: { "": { name: "root", dependencies: { a: "^1.0.0" } } },
			packages: {
				a: ["a@1.0.0", "", { peerDependencies: { missing: "*" } }, "sha512-a"],
			},
		})

		expect(resolved).toStrictEqual({
			"pkg:npm/a@1.0.0": {
				package_url: "pkg:npm/a@1.0.0",
				relationship: "direct",
				scope: "runtime",
				dependencies: [],
			},
		})
	})

	test("どの workspace からも辿れないパッケージがあれば、送る前に止める", () => {
		expect(() => {
			return buildResolved({
				lockfileVersion: 2,
				workspaces: { "": { name: "root" } },
				packages: { orphan: ["orphan@1.0.0", "", {}, "sha512-orphan"] },
			})
		}).toThrow("orphan")
	})
})

describe("parseLockfile", () => {
	test("registry と workspace の形だけのとき、そのまま返す", () => {
		expect(parseLockfile(lockfile)).toBe(lockfile)
	})

	test.each([
		["null", null],
		["lockfileVersion が 1", { ...lockfile, lockfileVersion: 1 }],
		["lockfileVersion が 3", { ...lockfile, lockfileVersion: 3 }],
		["packages が無い", { lockfileVersion: 2, workspaces: {} }],
		[
			"workspaces が null",
			{ lockfileVersion: 2, workspaces: null, packages: {} },
		],
	])("%s なら止める", (_, value) => {
		expect(() => {
			return parseLockfile(value)
		}).toThrow()
	})

	test("workspace が object でなければ、その key を添えて止める", () => {
		expect(() => {
			return parseLockfile({
				lockfileVersion: 2,
				workspaces: { "apps/a": null },
				packages: {},
			})
		}).toThrow("apps/a")
	})

	test("integrity が string でないエントリは止める", () => {
		expect(() => {
			return parseLockfile({
				lockfileVersion: 2,
				workspaces: {},
				packages: { "bad-integrity": ["bad-integrity@1.0.0", "", {}, 123] },
			})
		}).toThrow("bad-integrity")
	})

	test.each([
		["link", ["local@link:../local", {}]],
		["file", ["local@file:../local", { dependencies: { a: "^1.0.0" } }]],
		["github", ["lib@github:owner/lib#abc", {}, "owner-lib-abc"]],
	])(
		"registry でも workspace でもない形（%s）は key を添えて止める",
		(_, entry) => {
			expect(() => {
				return parseLockfile({
					lockfileVersion: 2,
					workspaces: {},
					packages: { local: entry },
				})
			}).toThrow("local")
		},
	)
})

describe("assertSubmitted", () => {
	test.each(["SUCCESS", "ACCEPTED"])(
		"201 で result が %s なら通す",
		(result) => {
			expect(() => {
				assertSubmitted(201, JSON.stringify({ result }))
			}).not.toThrow()
		},
	)

	test("201 でも result が INVALID なら message を添えて止める", () => {
		expect(() => {
			assertSubmitted(
				201,
				JSON.stringify({ result: "INVALID", message: "bad manifest" }),
			)
		}).toThrow("bad manifest")
	})

	test("2xx でも本文が JSON でなければ status と本文を添えて止める", () => {
		expect(() => {
			assertSubmitted(201, "<html>Bad Gateway</html>")
		}).toThrow("(201): <html>Bad Gateway</html>")
	})

	test("2xx でも本文に result が無ければ status と本文を添えて止める", () => {
		expect(() => {
			assertSubmitted(201, "{}")
		}).toThrow("(201): {}")
	})

	test("2xx 以外は本文を添えて止める", () => {
		expect(() => {
			assertSubmitted(403, "Resource not accessible")
		}).toThrow("Resource not accessible")
	})
})

describe("buildSnapshot", () => {
	test("bun.lock を 1 つの manifest として snapshot を組み立てる", () => {
		const snapshot = buildSnapshot(
			{
				lockfileVersion: 2,
				workspaces: { "": { name: "root" } },
				packages: {},
			},
			{
				sha: "0123456789abcdef0123456789abcdef01234567",
				ref: "refs/heads/develop",
				correlator: "Dependency submission_submit",
				runId: "42",
				scanned: "2026-10-30T00:00:00.000Z",
			},
		)

		expect(snapshot).toStrictEqual({
			version: 0,
			sha: "0123456789abcdef0123456789abcdef01234567",
			ref: "refs/heads/develop",
			job: { correlator: "Dependency submission_submit", id: "42" },
			detector: {
				name: "submit-bun-lock-dependencies",
				version: "1.0.0",
				url: "https://github.com/upward-inc/upward-connect-internal/blob/develop/scripts/submit-bun-lock-dependencies.ts",
			},
			scanned: "2026-10-30T00:00:00.000Z",
			manifests: {
				"bun.lock": {
					name: "bun.lock",
					file: { source_location: "bun.lock" },
					resolved: {},
				},
			},
		})
	})
})
