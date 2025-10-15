import { z } from "../libs/zod"

export const ProfileSchema = z
	.object({
		name: z.string().meta({
			description: "プロファイル名",
			example: "admin",
		}),
		display_name: z.string().meta({
			description: "プロファイルの表示名",
			example: "システム管理者",
		}),
	})
	.meta({
		description: "プロファイル",
	})

export const ProfileListSchema = z.array(ProfileSchema).meta({
	description: "プロファイル一覧",
})

export const GetProfileParamSchema = z.object({
	name: z.string(),
})

export type Profile = z.infer<typeof ProfileSchema>
export type ProfileList = z.infer<typeof ProfileListSchema>
