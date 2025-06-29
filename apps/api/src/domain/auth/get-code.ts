import { prisma } from "../../libs/prisma"

/**
 * 認可コードを取得する
 */
export const getAuthorizationCode = async (code: string) => {
	return await prisma.published_auth_code.findUnique({
		where: { auth_code: code },
	})
}
