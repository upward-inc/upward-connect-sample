import { prisma } from "../../libs/prisma"
import {
	type SystemUserList,
	SystemUserListSchema,
} from "../../schema/system-user"

export const getSystemUserList = async (): Promise<SystemUserList> => {
	const result = await prisma.user.findMany({
		include: {
			user_access_control_user_access_control_user_idTouser: {
				select: {
					profile: { select: { name: true } },
					role: { select: { name: true } },
				},
			},
		},
		orderBy: [{ user_name: "asc" }],
	})

	return SystemUserListSchema.parse(
		result.map((user) => {
			const { profile, role } =
				user.user_access_control_user_access_control_user_idTouser ?? {}

			if (!profile) {
				return
			}

			return {
				...user,
				profile_name: profile.name,
				role_name: role?.name ?? null,
			}
		}),
	)
}
