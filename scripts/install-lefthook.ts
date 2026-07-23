// git 管理下の git-dir を返す。git 管理外なら null。
function resolveGitDir(): string | null {
	try {
		const result = Bun.spawnSync(["git", "rev-parse", "--git-dir"])
		if (!result.success) return null
		return result.stdout.toString()
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

const result = Bun.spawnSync(["lefthook", "install"], { stdout: "inherit", stderr: "inherit" })
process.exit(result.exitCode ?? 0)
