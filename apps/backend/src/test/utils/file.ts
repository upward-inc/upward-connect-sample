import { testPrisma } from "../setup"

/**
 * Create a test file for tests
 * @param name - The name of the file
 * @param content - The content of the file
 * @param type - The MIME type of the file
 * @returns A File object representing the test file
 */
export function createTestFile(
	name: string,
	content: string,
	type = "text/plain",
) {
	const blob = new Blob([content], { type })
	return new File([blob], name, { type })
}

/**
 * テスト用ファイルの作成
 * @param sourceRecord - 出所レコードを表すJSON文字列（`JSON.stringify({ entity_name, id })`）
 */
export async function createTestFileInDB(
	userId: string,
	name: string,
	content: string | Uint8Array,
	type: string,
	sourceRecord?: string,
) {
	const contentBuffer = Buffer.from(content)

	return await testPrisma.file.create({
		data: {
			name,
			content: contentBuffer,
			type,
			source_record: sourceRecord,
			created_by: userId,
			modified_by: userId,
		},
	})
}
