import type { z } from "zod"

export type JsonValue =
	| string
	| number
	| boolean
	| null
	| { [key: string]: JsonValue }
	| JsonValue[]

/**
 * JSONとして解析可能な型
 */
export type ZodJsonType = z.ZodType<JsonValue, z.ZodTypeDef, JsonValue>
