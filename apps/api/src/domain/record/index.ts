export * from "./get-record-exists"
export * from "./get-record-list"
export * from "./create-record"
export * from "./validate-create-record-body"
export * from "./delete-record"
export * from "./validate-update-record-body"
export * from "./update-record"

export function escapeName(name: string) {
	return `[${name}]`
}

export function escapeStringValue(value: string) {
	return `N'${value.replace(/'/g, "''")}'`
}
