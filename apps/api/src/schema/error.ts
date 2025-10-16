import { z } from "../libs/zod"

export const OAuthErrorResultSchema = z
	.object({
		error: z.string().meta({
			description: "エラーコード",
			examples: [
				"invalid_request",
				"invalid_client",
				"invalid_grant",
				"unauthorized_client",
				"unsupported_grant_type",
				"invalid_scope",
			],
		}),
		error_description: z.string().optional().meta({
			description: "エラーの詳細説明",
		}),
	})
	.meta({ description: "OAuth2/OIDC エラー応答" })

export const ApiErrorResultSchema = z.object({
	message: z.string().meta({
		description: "エラーメッセージ",
	}),
})
