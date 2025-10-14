import { z } from "zod"
import { ToIntegerSchema, ToJsonObjectSchema } from "./utility"

const AscSchema = z.literal("asc").meta({
	description: "昇順",
})

const DescSchema = z.literal("desc").meta({
	description: "降順",
})

export const OrderByItemSchema = z
	.object({
		field: z.string().meta({
			description: "ソート対象のフィールド名",
			example: "name",
		}),
		direction: z
			.union([AscSchema, DescSchema])
			.optional()
			.default("asc")
			.meta({
				description: "ソート方向",
				examples: ["asc", "desc"],
			}),
	})
	.meta({
		description: "ソート条件",
		examples: [{ field: "category" }, { field: "price", direction: "desc" }],
	})

export const OrderBySchema = z.array(OrderByItemSchema)

export const LimitSchema = z.int().positive()
export const OffsetSchema = z.int().nonnegative()

export const OrderByQuerySchema = ToJsonObjectSchema(OrderBySchema).meta({
	description: "ソート条件",
	examples: [
		[{ field: "category" }],
		[
			{ field: "category", direction: "asc" },
			{ field: "price", direction: "desc" },
		],
	],
})

export const LimitQuerySchema = ToIntegerSchema.pipe(z.int().positive()).meta({
	description: "1回のリクエストで取得する最大レコード数",
	example: 100,
	minimum: 1,
})

export const OffsetQuerySchema = ToIntegerSchema.pipe(
	z.int().nonnegative(),
).meta({
	description: "取得開始位置（スキップするレコード数）",
	example: 0,
	minimum: 0,
})
