import type { Prisma } from "@prisma/client"
import { getRandomBoolean, getUniquePersons } from "./utility"

export async function seedUsers(prisma: Prisma.TransactionClient) {
	const users: Prisma.userCreateManyInput[] = await Promise.all(
		getUniquePersons(50)
			.map(({ firstName, lastName }) => {
				return {
					userName: `${firstName.roman}-${lastName.roman}`,
					firstName: firstName.value,
					lastName: lastName.value,
				}
			})
			.map(async ({ userName, firstName, lastName }) => {
				const email = `${userName}@example.com`
				const hashedPassword = await Bun.password.hash(userName)
				return {
					user_name: email,
					hashed_password: hashedPassword,
					first_name: firstName,
					last_name: lastName,
					email,
					timezone: "Asia/Tokyo",
					locale: "ja-JP",
					is_active: getRandomBoolean(0.9),
				}
			}),
	)

	const records = await prisma.user.createMany({ data: users })

	console.info(`>> user records created: ${records.count}`)

	return await prisma.user.findMany()
}
