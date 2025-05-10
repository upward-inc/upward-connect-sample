import { prisma } from "../../libs/prisma"
import { type RoleList, RoleListSchema } from "../../schema/role"

export const getRoleList = async (): Promise<RoleList> => {
	const result = await prisma.role.findMany({
		include: {
			role: {
				select: { name: true },
			},
		},
		orderBy: [{ order: "asc" }],
	})

	return RoleListSchema.parse(
		result.map((role) => ({
			...role,
			parent_name: role.role?.name,
		})),
	)
}
