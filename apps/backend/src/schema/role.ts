import { z } from "../libs/zod"

export const RoleSchema = z
	.object({
		name: z.string().meta({
			description: "ロール名",
			example: "east_japan_sales_department",
		}),
		display_name: z.string().meta({
			description: "ロールの表示名",
			example: "東日本営業部",
		}),
		parent_name: z.string().nullish().meta({
			description: "親ロール名",
			example: "sales_department",
		}),
	})
	.meta({
		description: "ロール",
	})

export const RoleListSchema = z.array(RoleSchema).meta({
	description: "ロール一覧",
})

export const GetRoleParamSchema = z.object({
	name: z.string(),
})

export type Role = z.infer<typeof RoleSchema>
export type RoleList = z.infer<typeof RoleListSchema>
