import type { Prisma } from "@prisma/client"

export async function seedProfiles(
	prisma: Prisma.TransactionClient,
	adminUserId: string,
) {
	const profiles: Prisma.profileCreateManyInput[] = [
		{ name: "admin", display_name: "システム管理者" },
		{ name: "standard_user", display_name: "一般ユーザー" },
		{ name: "guest_user", display_name: "ゲストユーザー" },
	].map((profile, index) => ({
		...profile,
		order: index + 1,
		created_by: adminUserId,
		modified_by: adminUserId,
	}))

	const records = await prisma.profile.createMany({ data: profiles })

	console.info(`>> profile records created: ${records.count}`)

	return records
}
