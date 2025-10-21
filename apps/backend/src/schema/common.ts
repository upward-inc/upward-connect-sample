import { z } from "../libs/zod"

// JSONに指定可能な値
export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
	z.union([
		z.null(),
		z.boolean(),
		z.number(),
		z.string(),
		z.array(JsonValueSchema),
		z.record(z.string(), JsonValueSchema),
	]),
)

// JSONオブジェクト
export const JsonObjectSchema: z.ZodType<Record<string, JsonValue>> = z.lazy(
	() => z.record(z.string(), JsonValueSchema),
)

export type JsonValue =
	| string
	| number
	| boolean
	| null
	| { [key: string]: JsonValue }
	| JsonValue[]

export type JsonObject = z.infer<typeof JsonObjectSchema>

/**
 * JSONとして解析可能な型
 */
export type ZodJsonType = z.ZodType<JsonValue, JsonValue>

export const UuidSchema = z.uuid()
export const EMailSchema = z.email()
export const UrlSchema = z.url()
export const PhoneNumberSchema = z
	.string()
	.regex(/^[0-9\s\-()+]+$/, "Invalid phone number")
export const ISO8601DateSchema = z.iso.date()
export const ISO8601DatetimeSchema = z.iso.datetime({ offset: true })
export const ISO8601TimeSchema = z.iso.time()

export type Uuid = z.infer<typeof UuidSchema>
export type EMail = z.infer<typeof EMailSchema>
export type Url = z.infer<typeof UrlSchema>
export type PhoneNumber = z.infer<typeof PhoneNumberSchema>
export type ISO8601Date = z.infer<typeof ISO8601DateSchema>
export type ISO8601Datetime = z.infer<typeof ISO8601DatetimeSchema>
export type ISO8601Time = z.infer<typeof ISO8601TimeSchema>
