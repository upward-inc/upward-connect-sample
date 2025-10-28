import { prisma } from "../../libs/prisma"
import { type PrivateKeyList, PrivateKeyListSchema } from "../../schema/auth"

export const getNotClosedPrivateKeyList = async (): Promise<PrivateKeyList> => {
	const result = await prisma.jwk_private_key.findMany({
		where: {
			validate_at: { lte: new Date() },
			closed_at: { gt: new Date() },
		},
	})

	return PrivateKeyListSchema.parseAsync(result)
}

export const getNotExpiredPrivateKeyList =
	async (): Promise<PrivateKeyList> => {
		const result = await prisma.jwk_private_key.findMany({
			where: {
				validate_at: { lte: new Date() },
				expire_at: { gt: new Date() },
			},
		})
		return PrivateKeyListSchema.parseAsync(result)
	}
