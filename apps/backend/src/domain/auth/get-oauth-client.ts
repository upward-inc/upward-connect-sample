import { prisma } from "../../libs/prisma"
import { type OAuthClient, OAuthClientSchema } from "../../schema/auth"

/**
 * IDで登録済みOAuthクライアントを取得する
 */
export const getOAuthClientById = async (
	clientId: string,
): Promise<OAuthClient | null> => {
	const client = await prisma.oauth_client.findUnique({
		where: {
			id: clientId,
		},
	})

	if (!client) {
		return null
	}

	return OAuthClientSchema.parse(client)
}
