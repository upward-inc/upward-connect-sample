import { execFileSync } from "child_process"
import path from "path"

import { parseInput } from "./lib/parse-input"

/** Biome が lint/format 対応する拡張子（このリポジトリで扱う対象） */
const BIOME_EXTENSIONS = new Set([
	".ts",
	".tsx",
	".mts",
	".cts",
	".js",
	".jsx",
	".mjs",
	".cjs",
	".json",
	".jsonc",
	".css",
])

/**
 * Claude Code PostToolUse hook: Biome で lint（安全な自動修正）・フォーマット・import 整理をまとめて適用する
 *
 * Edit/Write ツール実行後、対象ファイルに `biome check --write` を適用する（設定はルートの biome.json に従う）。
 * Biome が対応しない拡張子（.md / .yaml 等）はスキップする。
 */
async function main() {
	const input = await parseInput()
	if (input.status === "failure") {
		process.exit(0)
	}

	const filePath =
		typeof input.toolInput.file_path === "string"
			? input.toolInput.file_path
			: undefined
	if (!filePath) {
		process.exit(0)
	}

	// Biome 非対応の拡張子はスキップ
	if (!BIOME_EXTENSIONS.has(path.extname(filePath).toLowerCase())) {
		process.exit(0)
	}

	try {
		// check = lint(安全な修正) + format + import 整理
		// filePath はシェルを介さず引数配列で渡す（コマンドインジェクション防止）
		execFileSync("bun", ["biome", "check", "--write", filePath], {
			stdio: "inherit",
		})
	} catch {
		// 自動修正できない lint エラーは stdio: "inherit" で出力済み。hook 全体は止めない
		// （biome.json の ignore 対象を渡した場合の "No files processed" も同様に無害）
	}
}

main()
