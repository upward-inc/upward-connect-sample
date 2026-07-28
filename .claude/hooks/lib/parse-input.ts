interface ParseSuccess {
	status: "success"
	toolInput: Record<string, unknown>
	command: string
}

interface ParseFailure {
	status: "failure"
}

type ParseResult = ParseSuccess | ParseFailure

/**
 * stdin から Claude Code hook の JSON を読み取り、パースする共通ユーティリティ
 */
export function parseInput(): Promise<ParseResult> {
	return new Promise((resolve) => {
		let data = ""
		process.stdin.setEncoding("utf8")
		process.stdin.on("data", (chunk) => {
			data += chunk
		})
		process.stdin.on("end", () => {
			try {
				const json = JSON.parse(data)
				const toolInput = json.tool_input ?? json.input ?? {}
				const command = typeof toolInput.command === "string" ? toolInput.command.trim() : ""
				resolve({ status: "success", toolInput, command })
			} catch {
				resolve({ status: "failure" })
			}
		})
	})
}
