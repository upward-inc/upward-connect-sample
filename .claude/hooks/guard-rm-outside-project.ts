import { execSync } from "child_process"
import path from "path"

import { parseInput } from "./lib/parse-input"

/**
 * プロジェクト外のファイル削除(rm)をブロックする
 */
async function main() {
	const input = await parseInput()

	if (input.status === "failure") {
		process.stderr.write("Blocked: failed to parse hook input.\n")
		process.exit(2)
	}

	// rm コマンドでなければ許可
	if (!/^rm(\s|$)/.test(input.command)) {
		process.exit(0)
	}

	// プロジェクトルートを取得
	let projectRoot: string
	try {
		projectRoot = execSync("git rev-parse --show-toplevel", {
			encoding: "utf8",
		}).trim()
	} catch {
		// git リポジトリ外では安全のためブロック
		process.stderr.write("Blocked: unable to determine project root.\n")
		process.exit(2)
	}
	const normalizedRoot = path.normalize(projectRoot)

	// コマンドをシェルライクにトークン分割し、rm を除去
	const tokens = shellSplit(input.command).slice(1)

	for (const token of tokens) {
		// オプション引数はスキップ
		if (token.startsWith("-")) continue

		const absPath = path.normalize(path.resolve(token))

		if (!absPath.startsWith(normalizedRoot + path.sep) && absPath !== normalizedRoot) {
			process.stderr.write(
				`Blocked: rm is only allowed within the project directory (${projectRoot}).\n`,
			)
			process.exit(2)
		}
	}

	process.exit(0)
}

/**
 * クォート・エスケープを考慮したシェルライクなトークン分割
 */
function shellSplit(str: string): string[] {
	const tokens: string[] = []
	let current = ""
	let quote = ""
	let escape = false

	for (const ch of str) {
		if (escape) {
			current += ch
			escape = false
			continue
		}
		if (ch === "\\" && quote !== "'") {
			escape = true
			continue
		}
		if (quote) {
			if (ch === quote) {
				quote = ""
			} else {
				current += ch
			}
			continue
		}
		if (ch === '"' || ch === "'") {
			quote = ch
			continue
		}
		if (/\s/.test(ch)) {
			if (current) {
				tokens.push(current)
				current = ""
			}
			continue
		}
		current += ch
	}
	if (current) tokens.push(current)
	return tokens
}

main()
