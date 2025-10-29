import { date } from "@formkit/tempo"
import { prisma } from "../../libs/prisma"
import { type PrivateKeyList, PrivateKeyListSchema } from "../../schema/auth"

export const getNotClosedJwkPrivateKeyList =
	async (): Promise<PrivateKeyList> => {
		const now = date()
		const result = await prisma.jwk_private_key.findMany({
			where: {
				validate_at: { lte: now },
				closed_at: { gte: now },
			},
		})

		return PrivateKeyListSchema.parseAsync(result)
	}

export const getNotExpiredJwkPrivateKeyList =
	async (): Promise<PrivateKeyList> => {
		const now = date()
		const result = await prisma.jwk_private_key.findMany({
			where: {
				validate_at: { lte: now },
				expire_at: { gte: now },
			},
		})
		return PrivateKeyListSchema.parseAsync(result)
	}
