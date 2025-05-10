import { z } from "zod"
import "zod-openapi/extend"

export const RoleSchema = z
	.object({
		name: z.string().openapi({
			description: "名称",
			example: "east_japan_sales_department",
		}),
		display_name: z.string().openapi({
			description: "表示名",
			example: "東日本営業部 ",
		}),
		parent_name: z.string().nullish().openapi({
			description: "親ロールの名称",
			example: "sales_department",
		}),
	})
	.openapi({
		description: "ロールの説明",
	})

export const RoleListSchema = z.array(RoleSchema)

export const GetRoleParamSchema = z.object({
	name: z.string(),
})

export type Role = z.infer<typeof RoleSchema>
export type RoleList = z.infer<typeof RoleListSchema>
