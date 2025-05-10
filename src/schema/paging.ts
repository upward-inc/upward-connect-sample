import { z } from "zod"
import "zod-openapi/extend"
import { ToIntegerSchema, ToJsonObjectSchema } from "./utility"

const AscSchema = z.literal("asc").openapi({
	description: "昇順",
})

const DescSchema = z.literal("desc").openapi({
	description: "降順",
})

export const OrderByItemSchema = z
	.object({
		field: z.string().openapi({
			description: "ソート対象のフィールド名",
			example: "name",
		}),
		direction: z
			.union([AscSchema, DescSchema])
			.optional()
			.default("asc")
			.openapi({
				description: "ソート方向",
				examples: ["asc", "desc"],
			}),
	})
	.openapi({
		description: "ソート条件",
		examples: [{ field: "category" }, { field: "price", direction: "desc" }],
	})

export const OrderBySchema = z.array(OrderByItemSchema)

export const LimitSchema = z.number().int().positive()
export const OffsetSchema = z.number().int().nonnegative()

export const OrderByQuerySchema = ToJsonObjectSchema(OrderBySchema).openapi({
	description: "ソート条件",
	examples: [
		[{ field: "category" }],
		[
			{ field: "category", direction: "asc" },
			{ field: "price", direction: "desc" },
		],
	],
})

export const LimitQuerySchema = ToIntegerSchema.pipe(
	z.number().int().positive(),
).openapi({
	description: "1回のリクエストで取得する最大レコード数",
	example: 100,
	minimum: 1,
})

export const OffsetQuerySchema = ToIntegerSchema.pipe(
	z.number().int().nonnegative(),
).openapi({
	description: "取得開始位置（スキップするレコード数）",
	example: 0,
	minimum: 0,
})
