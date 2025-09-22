/**
 * Create a test file for integration tests
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
