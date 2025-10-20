/**
 * オブジェクトからQueryStringを生成する
 *
 * @example
 * ```ts
 * generateQueryString({ fields: "id,name", filter: { and: [{ field: "name", operator: "eq", value: "John" }] } })
 * // => "?fields=id,name&filter={\"and\":[{\"field\":\"name\",\"operator\":\"eq\",\"value\":\"John\"}]}"
 * ```
 */
export function generateQueryString(object: object) {
	const params = new URLSearchParams()
	for (const [key, value] of Object.entries(object)) {
		if (typeof value === "object") {
			params.append(key, JSON.stringify(value))
		} else {
			params.append(key, String(value))
		}
	}
	const query = params.toString()
	return query ? `?${query}` : ""
}
