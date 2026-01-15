export function escapeName(name: string) {
	return `[${name}]`
}

export function escapeStringValue(value: string) {
	return `N'${value.replace(/'/g, "''")}'`
}
