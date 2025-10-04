import { z } from "zod"
import "zod-openapi/extend"

export const RoleSchema = z
	.object({
		name: z.string().openapi({
			description: "ロール名",
			example: "east_japan_sales_department",
		}),
		display_name: z.string().openapi({
			description: "ロールの表示名",
			example: "東日本営業部",
		}),
		parent_name: z.string().nullish().openapi({
			description: "親ロール名",
			example: "sales_department",
		}),
	})
	.openapi({
		description: "ロール",
	})

export const RoleListSchema = z.array(RoleSchema).openapi({
	description: "ロール一覧",
})

export const GetRoleParamSchema = z.object({
	name: z.string(),
})

export type Role = z.infer<typeof RoleSchema>
export type RoleList = z.infer<typeof RoleListSchema>
