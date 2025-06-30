import { prisma } from "../../libs/prisma"

/**
 * 発行済み認可コード情報を取得する
 */
export const getAuthorizationCode = async (code: string) => {
	return await prisma.published_auth_code.findUnique({
		where: { auth_code: code },
	})
}
