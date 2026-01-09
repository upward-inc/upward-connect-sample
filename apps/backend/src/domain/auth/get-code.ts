import { prisma } from "../../libs/prisma"
import {
	type PublishedAuthCode,
	PublishedAuthCodeSchema,
} from "../../schema/auth"

/**
 * 発行済み認可コード情報を取得する
 */
export const getAuthorizationCode = async (
	code: string,
): Promise<PublishedAuthCode | null> => {
	const authCode = await prisma.published_auth_code.findUnique({
		where: { auth_code: code },
	})

	if (!authCode) {
		return null
	}

	return PublishedAuthCodeSchema.parse(authCode)
}
