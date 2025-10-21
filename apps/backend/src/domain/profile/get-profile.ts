import { prisma } from "../../libs/prisma"
import { type Profile, ProfileSchema } from "../../schema/profile"

export const getProfile = async (
	name: Profile["name"],
): Promise<Profile | null> => {
	const result = await prisma.profile.findUnique({
		where: { name },
	})

	return result ? ProfileSchema.parse(result) : null
}
