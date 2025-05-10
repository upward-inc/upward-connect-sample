import { prisma } from "../../libs/prisma"
import { type SystemUser, SystemUserSchema } from "../../schema/system-user"

export const getSystemUser = async (
	id: SystemUser["id"],
): Promise<SystemUser | null> => {
	const result = await prisma.user.findUnique({
		where: { id },
		include: {
			user_access_control_user_access_control_user_idTouser: {
				select: {
					profile: { select: { name: true } },
					role: { select: { name: true } },
				},
			},
		},
	})

	if (!result) {
		return null
	}

	const { profile, role } =
		result.user_access_control_user_access_control_user_idTouser ?? {}

	if (!profile) {
		return null
	}

	return SystemUserSchema.parse({
		...result,
		profile_name: profile.name,
		role_name: role?.name ?? null,
	})
}
