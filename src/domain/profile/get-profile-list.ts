import { prisma } from "../../libs/prisma"
import { type ProfileList, ProfileListSchema } from "../../schema/profile"

export const getProfileList = async (): Promise<ProfileList> => {
	const result = await prisma.profile.findMany({
		orderBy: [{ order: "asc" }],
	})
	return ProfileListSchema.parse(result)
}
