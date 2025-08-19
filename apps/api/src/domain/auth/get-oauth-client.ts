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

/**
 * 名前で最初の登録済みOAuthクライアントを取得する
 */
export const getFirstOAuthClientByName = async (
	clientName: string,
): Promise<OAuthClient | null> => {
	const client = await prisma.oauth_client.findFirst({
		where: {
			name: clientName,
		},
		orderBy: {
			created_at: "asc",
		},
	})

	if (!client) {
		return null
	}

	return OAuthClientSchema.parse(client)
}
