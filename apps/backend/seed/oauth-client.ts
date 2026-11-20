import { nanoid } from "nanoid"
import type { Prisma } from "../prisma/generated/client"

export async function seedOauthClients(prisma: Prisma.TransactionClient) {
	const oauthClients: Prisma.oauth_clientCreateManyInput[] = [
		{
			// TODO: 実際のリダイレクトURLを設定する
			name: "UPWARD",
			secret: nanoid(128),
			redirect_uris: "https://upward.localhost:1234/callback",
			scopes: "openid,profile,email,offline_access",
		},
	]

	const records = await prisma.oauth_client.createMany({ data: oauthClients })

	console.info(`>> oauth_client records created: ${records.count}`)

	return records
}
