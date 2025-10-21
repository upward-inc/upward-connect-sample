import { prisma } from "../../libs/prisma"
import { type Role, RoleSchema } from "../../schema/role"

export const getRole = async (name: Role["name"]): Promise<Role | null> => {
	const result = await prisma.role.findUnique({
		where: { name },
		include: {
			role: {
				select: { name: true },
			},
		},
	})

	return result
		? RoleSchema.parse({
				...result,
				parent_name: result.role?.name,
			})
		: null
}
