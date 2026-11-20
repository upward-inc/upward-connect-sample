/**
 * bun.lock の解決済み依存を Dependency submission API へ送り、依存関係グラフに載せる。
 *
 * 依存関係グラフは bun.lock を静的解析せず、package.json から推測した間接依存は Dependabot の脆弱性チェックから除外される。
 * そのため npm の推移依存に Dependabot alert と security update が届かない。
 * bun.lock の全パッケージを送り、dependencies から辿れるものを runtime、devDependencies からしか辿れないものを development とする。
 * optional peer は依存元が入れるものではないため辿らない。
 * ただし、bun がそのパッケージのために配下へ置いたもの（`{key}/{dep}` の配置）は、そのパッケージの依存として辿る。
 *
 * 送った snapshot は依存関係グラフの bun.lock 由来の依存を丸ごと置き換える。
 * 読み違えた snapshot を送ると推移依存がグラフから消えるため、想定外の形の bun.lock や、辿れないパッケージが残る結果は送る前に止める。
 *
 * 実行には GITHUB_REPOSITORY / GITHUB_SHA / GITHUB_REF / GITHUB_WORKFLOW / GITHUB_JOB / GITHUB_RUN_ID / GITHUB_TOKEN が要る。
 * `--dry-run` を付けると送らずに snapshot を標準出力へ書く（GITHUB_REPOSITORY と GITHUB_TOKEN は不要）。
 */

import { join } from "node:path"

type Dependencies = Record<string, string>

interface PackageInfo {
	dependencies?: Dependencies
	optionalDependencies?: Dependencies
	peerDependencies?: Dependencies
	optionalPeers?: string[]
}

interface Workspace {
	name?: string
	dependencies?: Dependencies
	optionalDependencies?: Dependencies
	devDependencies?: Dependencies
}

// registry は ["name@version", registry, info, integrity]、workspace は ["name@workspace:path"] の形を取る
type PackageEntry =
	| readonly [string, string, PackageInfo, string]
	| readonly [string]

// このリポジトリの Bun（1.4 系）が通常書く lockfileVersion。
// 2 は 1 と JSON の形が同じで、Bun が読み込み時に行う検査が増えただけなので、1 と同じ解析で読める。
// 1 は別の版の Bun で bun.lock が書き戻されたことを示すため、送る前に止めて気づけるようにする。
// 3 は入れ子や版指定の overrides を使うと書かれるが、形を確かめていないため受け付けない。
const SUPPORTED_LOCKFILE_VERSION = 2

export interface Lockfile {
	lockfileVersion: typeof SUPPORTED_LOCKFILE_VERSION
	workspaces: Record<string, Workspace>
	packages: Record<string, PackageEntry>
}

interface ResolvedDependency {
	package_url: string
	relationship: "direct" | "indirect"
	scope: "runtime" | "development"
	dependencies: string[]
}

interface SnapshotMeta {
	sha: string
	ref: string
	correlator: string
	runId: string
	scanned: string
}

function parseId(id: string): { name: string; version: string } {
	// scope 付きの名前は先頭が @ なので、2 文字目以降で区切る
	const at = id.indexOf("@", 1)
	return { name: id.slice(0, at), version: id.slice(at + 1) }
}

function toPurl(id: string): string {
	const { name, version } = parseId(id)
	return `pkg:npm/${name.replace(/^@/, "%40")}@${encodeURIComponent(version)}`
}

// "a/@scope/b/c" → ["a", "@scope/b", "c"]。scope を持つ名前は "/" を含むため単純に分割できない
function splitKey(key: string): string[] {
	const names: string[] = []
	const segments = key.split("/")
	for (let i = 0; i < segments.length; i++) {
		const segment = segments[i] ?? ""
		names.push(
			segment.startsWith("@") ? `${segment}/${segments[++i]}` : segment,
		)
	}
	return names
}

// node_modules と同じく、自身の配下から親へ遡り、最後にトップレベルを引く
function resolveKey(
	lockfile: Lockfile,
	fromKey: string,
	dep: string,
): string | undefined {
	const names = fromKey ? splitKey(fromKey) : []
	for (let depth = names.length; depth >= 0; depth--) {
		const candidate = [...names.slice(0, depth), dep].join("/")
		if (lockfile.packages[candidate]) return candidate
	}
	return undefined
}

function childrenOf(lockfile: Lockfile, key: string): string[] {
	const info = lockfile.packages[key]?.[2]
	const optionalPeers = new Set(info?.optionalPeers)
	const deps = Object.keys({
		...info?.dependencies,
		...info?.optionalDependencies,
		...info?.peerDependencies,
	})
	return deps.flatMap((dep) => {
		const resolved = resolveKey(lockfile, key, dep)
		// optional peer は、bun がこのパッケージのために配下へ置いたものだけを辿る
		if (optionalPeers.has(dep) && resolved !== `${key}/${dep}`) return []
		return resolved ?? []
	})
}

function reachableFrom(lockfile: Lockfile, roots: string[]): Set<string> {
	const reached = new Set<string>()
	const queue = [...roots]
	for (let key = queue.pop(); key !== undefined; key = queue.pop()) {
		if (reached.has(key)) continue
		reached.add(key)
		queue.push(...childrenOf(lockfile, key))
	}
	return reached
}

function isThirdParty(lockfile: Lockfile, key: string): boolean {
	return lockfile.packages[key]?.length === 4
}

/**
 * bun.lock から snapshot の `resolved` を組み立てる。
 *
 * 同じ name@version が複数の配置に現れたときは 1 つにまとめ、direct と runtime を優先する。
 *
 * @throws どの workspace からも辿れない third-party のパッケージがあるとき
 */
export function buildResolved(
	lockfile: Lockfile,
): Record<string, ResolvedDependency> {
	const workspaces = Object.values(lockfile.workspaces)
	const rootsOf = (
		pick: (workspace: Workspace) => Dependencies[],
	): string[] => {
		return workspaces.flatMap((workspace) => {
			const deps = Object.keys(Object.assign({}, ...pick(workspace)))
			// workspace ごとに異なるバージョンは "{workspace の name}/{dep}" に置かれる
			const fromKey =
				workspace.name && lockfile.packages[workspace.name]
					? workspace.name
					: ""
			return deps.flatMap((dep) => {
				return resolveKey(lockfile, fromKey, dep) ?? []
			})
		})
	}
	const runtimeRoots = rootsOf((w) => {
		return [w.dependencies ?? {}, w.optionalDependencies ?? {}]
	})
	const devRoots = rootsOf((w) => {
		return [w.devDependencies ?? {}]
	})
	const direct = new Set([...runtimeRoots, ...devRoots])
	const runtime = reachableFrom(lockfile, runtimeRoots)
	const development = reachableFrom(lockfile, devRoots)

	const unreached = Object.keys(lockfile.packages).filter((key) => {
		return (
			isThirdParty(lockfile, key) && !runtime.has(key) && !development.has(key)
		)
	})
	if (unreached.length) {
		throw new Error(
			`どの workspace からも辿れないパッケージがある: ${unreached.join(", ")}`,
		)
	}

	const resolved: Record<string, ResolvedDependency> = {}
	for (const key of new Set([...runtime, ...development])) {
		const id = lockfile.packages[key]?.[0]
		if (!id || !isThirdParty(lockfile, key)) continue
		const purl = toPurl(id)
		const dependencies = childrenOf(lockfile, key)
			.filter((child) => {
				return isThirdParty(lockfile, child)
			})
			.map((child) => {
				return toPurl(lockfile.packages[child]?.[0] ?? "")
			})
		const existing = resolved[purl]
		resolved[purl] = {
			package_url: purl,
			relationship:
				direct.has(key) || existing?.relationship === "direct"
					? "direct"
					: "indirect",
			scope:
				runtime.has(key) || existing?.scope === "runtime"
					? "runtime"
					: "development",
			dependencies: [
				...new Set([...(existing?.dependencies ?? []), ...dependencies]),
			],
		}
	}
	return resolved
}

export function buildSnapshot(lockfile: Lockfile, meta: SnapshotMeta) {
	return {
		version: 0,
		sha: meta.sha,
		ref: meta.ref,
		job: { correlator: meta.correlator, id: meta.runId },
		detector: {
			name: "submit-bun-lock-dependencies",
			version: "1.0.0",
			url: "https://github.com/upward-inc/upward-connect-internal/blob/develop/scripts/submit-bun-lock-dependencies.ts",
		},
		scanned: meta.scanned,
		manifests: {
			"bun.lock": {
				name: "bun.lock",
				file: { source_location: "bun.lock" },
				resolved: buildResolved(lockfile),
			},
		},
	}
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null
}

function isPackageEntry(entry: unknown): entry is PackageEntry {
	if (!Array.isArray(entry) || typeof entry[0] !== "string") return false
	if (entry.length === 1)
		return parseId(entry[0]).version.startsWith("workspace:")
	return (
		entry.length === 4 &&
		typeof entry[1] === "string" &&
		isObject(entry[2]) &&
		typeof entry[3] === "string"
	)
}

/**
 * 解析した bun.lock の形を確かめる。
 *
 * git / github / tarball / link / file の依存は要素の並びが registry と異なり、名前とバージョンを取り違えるため、扱いを決めるまで止める。
 *
 * @throws bun.lock が想定外の形のとき（lockfileVersion が 2 でない、workspaces / packages が無い、object でない workspace がある、registry と workspace 以外の形のエントリがある）
 */
export function parseLockfile(value: unknown): Lockfile {
	if (
		!isObject(value) ||
		value.lockfileVersion !== SUPPORTED_LOCKFILE_VERSION
	) {
		throw new Error(
			`bun.lock の lockfileVersion が ${SUPPORTED_LOCKFILE_VERSION} ではない`,
		)
	}
	const { workspaces, packages } = value
	if (!isObject(workspaces) || !isObject(packages)) {
		throw new Error("bun.lock に workspaces と packages が無い")
	}
	const invalidWorkspaces = Object.keys(workspaces).filter((key) => {
		return !isObject(workspaces[key])
	})
	if (invalidWorkspaces.length) {
		throw new Error(
			`object でない workspace がある: ${invalidWorkspaces.join(", ")}`,
		)
	}
	const unsupported = Object.keys(packages).filter((key) => {
		return !isPackageEntry(packages[key])
	})
	if (unsupported.length) {
		throw new Error(
			`registry と workspace 以外の形のエントリは扱えない: ${unsupported.join(", ")}`,
		)
	}
	// 上の検査で理由を挙げられない食い違いが残ったときの備え
	if (!isLockfile(value)) throw new Error("bun.lock が想定外の形をしている")
	return value
}

function isLockfile(value: unknown): value is Lockfile {
	return (
		isObject(value) &&
		value.lockfileVersion === SUPPORTED_LOCKFILE_VERSION &&
		isObject(value.workspaces) &&
		Object.values(value.workspaces).every(isObject) &&
		isObject(value.packages) &&
		Object.values(value.packages).every(isPackageEntry)
	)
}

/**
 * snapshot の送信結果を確かめる。
 *
 * API は 201 でも snapshot を受け付けないことがあり、その場合は本文の `result` が `INVALID` になる。
 *
 * @throws 2xx 以外のとき、本文が JSON でないとき、または `result` が `SUCCESS` / `ACCEPTED` 以外のとき
 */
export function assertSubmitted(status: number, body: string): void {
	if (status < 200 || status >= 300) {
		throw new Error(`snapshot の送信に失敗した (${status}): ${body}`)
	}
	let parsed: unknown
	try {
		parsed = JSON.parse(body)
	} catch {
		throw new Error(
			`snapshot の送信結果を解析できなかった (${status}): ${body}`,
		)
	}
	const result = isObject(parsed) ? parsed.result : undefined
	if (result !== "SUCCESS" && result !== "ACCEPTED") {
		throw new Error(`snapshot が受け付けられなかった (${status}): ${body}`)
	}
}

function requireEnv(name: string): string {
	const value = process.env[name]
	if (!value) throw new Error(`環境変数 ${name} が設定されていない`)
	return value
}

async function main(): Promise<void> {
	const dryRun = process.argv.includes("--dry-run")
	const lockfile = parseLockfile(
		Bun.JSONC.parse(
			await Bun.file(join(import.meta.dirname, "..", "bun.lock")).text(),
		),
	)

	const snapshot = buildSnapshot(lockfile, {
		sha: requireEnv("GITHUB_SHA"),
		ref: requireEnv("GITHUB_REF"),
		correlator: `${requireEnv("GITHUB_WORKFLOW")}_${requireEnv("GITHUB_JOB")}`,
		runId: requireEnv("GITHUB_RUN_ID"),
		scanned: new Date().toISOString(),
	})
	const count = Object.keys(snapshot.manifests["bun.lock"].resolved).length
	if (dryRun) {
		process.stdout.write(`${JSON.stringify(snapshot, null, "\t")}\n`)
		process.stderr.write(`${count} 件（dry-run のため送信していない）\n`)
		return
	}

	const response = await fetch(
		`https://api.github.com/repos/${requireEnv("GITHUB_REPOSITORY")}/dependency-graph/snapshots`,
		{
			method: "POST",
			headers: {
				Accept: "application/vnd.github+json",
				Authorization: `Bearer ${requireEnv("GITHUB_TOKEN")}`,
				"X-GitHub-Api-Version": "2022-11-28",
			},
			body: JSON.stringify(snapshot),
		},
	)
	const body = await response.text()
	assertSubmitted(response.status, body)
	process.stdout.write(`${count} 件を送信した: ${body}\n`)
}

if (import.meta.main) await main()
