import { prisma } from "../../libs/prisma"

/**
 * 認可コードを削除する
 */
export const deleteAuthorizationCode = async (code: string) => {
	await prisma.published_auth_code.delete({
		where: { auth_code: code },
	})
}
