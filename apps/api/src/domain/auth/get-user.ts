import { prisma } from "../../libs/prisma"
import { type LoggedInUser, LoggedInUserSchema } from "../../schema/auth"

/**
 * IDでユーザーを取得する
 */
export const getUserById = async (
	userId: string,
): Promise<LoggedInUser | null> => {
	const user = await prisma.user.findUnique({
		where: {
			id: userId,
		},
		select: {
			id: true,
			user_name: true,
			hashed_password: true,
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

/**
 * ユーザー名とパスワードでユーザーを取得する
 */
export const getUserByUsernameAndPassword = async (
	username: string,
	password: string,
): Promise<LoggedInUser | null> => {
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
			email: true,
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
