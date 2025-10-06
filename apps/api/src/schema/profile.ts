import { z } from "zod"
import "zod-openapi/extend"

export const ProfileSchema = z
	.object({
		name: z.string().openapi({
			description: "プロファイル名",
			example: "admin",
		}),
		display_name: z.string().openapi({
			description: "プロファイルの表示名",
			example: "システム管理者",
		}),
	})
	.openapi({
		description: "プロファイル",
	})

export const ProfileListSchema = z.array(ProfileSchema).openapi({
	description: "プロファイル一覧",
})

export const GetProfileParamSchema = z.object({
	name: z.string(),
})

export type Profile = z.infer<typeof ProfileSchema>
export type ProfileList = z.infer<typeof ProfileListSchema>
