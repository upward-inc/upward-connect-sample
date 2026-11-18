// git 管理下の git-dir を返す。git 管理外なら null。
function resolveGitDir(): string | null {
	try {
		const result = Bun.spawnSync(["git", "rev-parse", "--git-dir"])
		if (!result.success) return null
		return result.stdout.toString().trim()
	} catch {
		return null
	}
}

const gitDir = resolveGitDir()

// git 管理外 (CI の成果物 install、.git を含まない Docker COPY 等) では hook を入れられないので何もしない。
if (gitDir === null) {
	process.exit(0)
}

// worktree は共有 .git/hooks を継承するため install 不要。
// ここで lefthook install すると共有 .git/config の core.hooksPath が設定され、他チェックアウトの install が壊れる。
// セパレータは OS により / と \ の両方を考慮する。
if (/[/\\]worktrees[/\\]/.test(gitDir)) {
	console.log("Skipping lefthook install in git worktree")
	process.exit(0)
}

// フックを入れられなかった、または更新できなかったとき、コミット前の検査が行われない恐れと復旧手順を伝える。
const HOOKS_NOT_INSTALLED_HINT =
	"Git hooks may not be installed or up to date, so commits may not be checked (biome, gitleaks). Fix the cause, then run `bun install` again. See docs/development/setup.md"

// lefthook は mise.toml で版を固定しているため、mise 経由で起動する。
// mise 未インストール環境では実行ファイルが見つからず spawnSync が例外を投げる。
// bun install 全体を失敗させないよう捕捉し、終了コード 0 で抜ける。
try {
	const result = Bun.spawnSync(
		["mise", "exec", "lefthook", "--", "lefthook", "install"],
		{
			stdout: "inherit",
			stderr: "inherit",
		},
	)
	// lefthook install の失敗は補助処理の失敗であり、bun install 全体を落とすべきではないため、終了コードは 0 のままにする。
	if (!result.success) {
		console.error("lefthook install failed; see output above for details")
		console.error(HOOKS_NOT_INSTALLED_HINT)
	}
	process.exit(0)
} catch (error) {
	console.error(
		"Skipping lefthook install: mise not found",
		error instanceof Error ? error.message : error,
	)
	console.error(HOOKS_NOT_INSTALLED_HINT)
	process.exit(0)
}
