import { prisma } from "../../libs/prisma"
import { type LoggedInUser, LoggedInUserSchema } from "../../schema/auth"

/**
 * ユーザー名とパスワードでユーザーを検証する
 */
export const verifyUser = async (
	username: string,
	password: string,
): Promise<LoggedInUser | null> => {
	// ユーザー名で検索
	const user = await prisma.user.findUnique({
		where: {
			user_name: username,
		},
		select: {
			id: true,
			user_name: true,
			hashed_password: true,
			first_name: true,
			last_name: true,
		},
	})

	if (!user) {
		return null
	}

	// 提供されたパスワードとデータベースのハッシュ化されたパスワードを比較
	const result = await Bun.password.verify(password, user.hashed_password)
	if (!result) {
		return null
	}

	return LoggedInUserSchema.parse(user)
}
