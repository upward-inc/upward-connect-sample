import type { Prisma, user } from "@prisma/client"
import { getAnyRow, getRandomBoolean } from "./utility"

export async function seedUserAccessControls(
	prisma: Prisma.TransactionClient,
	users: user[],
	adminUserId: string,
) {
	const profiles = await prisma.profile.findMany()
	const roles = await prisma.role.findMany()

	const userAccessControls: Prisma.user_access_controlCreateManyInput[] =
		users.map((user) => {
			const profile = getAnyRow(profiles)
			const role = getAnyRow(roles)

			return {
				user_id: user.id,
				profile_id: profile.id,
				role_id: getRandomBoolean(0.9) ? role.id : null,
				created_by: adminUserId,
				modified_by: adminUserId,
			}
		})

	const records = await prisma.user_access_control.createMany({
		data: userAccessControls,
	})

	console.info(`>> user_access_control records created: ${records.count}`)

	return await prisma.entity.findMany()
}
