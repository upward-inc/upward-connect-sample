import { prisma } from "../../libs/prisma"
import { type LoggedInUser, LoggedInUserSchema } from "../../schema/auth"

/**
 * ログイン済みユーザーを取得する
 */
export const getLoggedInUser = async (
	id: string,
): Promise<LoggedInUser | null> => {
	const user = await prisma.user.findUnique({
		where: { id },
		select: {
			id: true,
			user_name: true,
			first_name: true,
			last_name: true,
			email: true,
		},
	})

	if (!user) {
		return null
	}

	return LoggedInUserSchema.parse(user)
}
