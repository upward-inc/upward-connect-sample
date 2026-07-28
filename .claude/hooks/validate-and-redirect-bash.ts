import { parseInput } from "./lib/parse-input"

const BLOCKED_COMMANDS: Record<string, string> = {
	// リポジトリ利用パッケージマネージャーへの誘導
	npm: "Use bun instead of npm/pnpm/yarn.",
	pnpm: "Use bun instead of npm/pnpm/yarn.",
	yarn: "Use bun instead of npm/pnpm/yarn.",

	// Claude Code専用ツールへの誘導
	grep: "Use the Grep tool instead of Bash(grep/rg).",
	rg: "Use the Grep tool instead of Bash(grep/rg).",
	find: "Use the Glob tool instead of Bash(find).",
	cat: "Use the Read tool instead of Bash(cat/head/tail).",
	head: "Use the Read tool instead of Bash(cat/head/tail).",
	tail: "Use the Read tool instead of Bash(cat/head/tail).",
	sed: "Use the Edit tool instead of Bash(sed/awk).",
	awk: "Use the Edit tool instead of Bash(sed/awk).",
	curl: "Use the WebFetch tool instead of Bash(curl/wget).",
	wget: "Use the WebFetch tool instead of Bash(curl/wget).",

	// Issue を Linear で管理するよう誘導
	"gh issue create":
		"Use Linear MCP (mcp__linear-server__save_issue) instead of Bash(gh issue create).",
	"gh issue edit":
		"Use Linear MCP (mcp__linear-server__save_issue) instead of Bash(gh issue edit).",
	"gh issue close":
		"Use Linear MCP (mcp__linear-server__save_issue with state=Done) instead of Bash(gh issue close).",
	"gh issue reopen":
		'Use Linear MCP (mcp__linear-server__save_issue with state="In Progress") instead of Bash(gh issue reopen).',
	"gh issue delete":
		"Linear has no hard delete. Cancel via mcp__linear-server__save_issue (state=Canceled) or archive via Linear UI instead of Bash(gh issue delete).",
	"gh issue comment":
		"Use Linear MCP (mcp__linear-server__save_comment) instead of Bash(gh issue comment).",
}

/**
 * Bashコマンドを検証し、適切なツールへ誘導する
 */
async function main() {
	const input = await parseInput()

	if (input.status === "failure") {
		process.exit(0)
	}

	// コマンドをトークン分割し、各キーがコマンド先頭と一致するかを検査
	const tokens = input.command.split(/\s+/)

	for (const [key, message] of Object.entries(BLOCKED_COMMANDS)) {
		const keyTokens = key.split(/\s+/)
		if (
			keyTokens.every((kt, i) => {
				return tokens[i] === kt
			})
		) {
			process.stderr.write(message + "\n")
			process.exit(2)
		}
	}

	process.exit(0)
}

main()
