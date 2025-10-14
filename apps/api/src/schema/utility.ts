import { z } from "zod"
import type { ZodJsonType } from "./common"

/**
 * セパレータによって区切られた文字列を配列に変換する
 */
export const StringToArraySchema = (separator = ",") => {
	return z
		.string()
		.transform((value) => value.split(separator).map((value) => value.trim()))
}

/**
 * 任意の値を整数に変換する
 */
export const ToIntegerSchema = z.preprocess((value) => {
	if (typeof value === "string" || typeof value === "number") {
		return Number(value)
	}
	return value
}, z.int())

/**
 * 任意の値を日付に変換する
 *
 * @description 日付として表現したいが`z.date()`を使用できない特殊なケースで使用する
 */
export const ToDateSchema = z.preprocess((value) => {
	if (typeof value === "string" || typeof value === "number") {
		return new Date(value)
	}
	return value
}, z.iso.date())

/**
 * 文字列またはその他の値をJSONとして解析し、指定されたスキーマに変換する
 *
 * @description 実質的にはJSON形式の値であるが、クエリパラメータのように文字列として表現される値の変換に使用する
 */
export const ToJsonObjectSchema = <T extends ZodJsonType>(schema: T) => {
	return z.preprocess((value) => {
		return JSON.parse(typeof value === "string" ? value : String(value))
	}, schema)
}
