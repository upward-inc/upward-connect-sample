import { z } from "zod"
import "zod-openapi/extend"

export const ProfileSchema = z
	.object({
		name: z.string().openapi({
			description: "名称",
			example: "admin",
		}),
		display_name: z.string().openapi({
			description: "表示名",
			example: "システム管理者",
		}),
	})
	.openapi({
		description: "プロファイルの説明",
	})

export const ProfileListSchema = z.array(ProfileSchema)

export const GetProfileParamSchema = z.object({
	name: z.string(),
})

export type Profile = z.infer<typeof ProfileSchema>
export type ProfileList = z.infer<typeof ProfileListSchema>
