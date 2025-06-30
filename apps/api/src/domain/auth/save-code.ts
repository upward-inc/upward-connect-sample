import { prisma } from "../../libs/prisma"

/**
 * 認可コード情報を保存する
 */
export const saveAuthorizationCode = async (
	code: string,
	userId: string,
	payload: {
		client_id: string
		client_secret: string
		redirect_uri: string
		scope: string | null
		state: string | null
		nonce: string | null
		published_at: Date
		expire_at: Date
	},
) => {
	await prisma.published_auth_code.upsert({
		create: {
			auth_code: code,
			user_id: userId,
			...payload,
		},
		update: {
			user_id: userId,
			...payload,
		},
		where: { auth_code: code },
	})
}
