import type { Prisma } from "@prisma/client"
import { getRandomBoolean, getUniquePersons } from "./utility"

export async function seedUsers(prisma: Prisma.TransactionClient) {
	const users: Prisma.userCreateManyInput[] = getUniquePersons(50)
		.map(({ firstName, lastName }) => {
			return {
				userName: `${firstName.roman}-${lastName.roman}`,
				firstName: firstName.value,
				lastName: lastName.value,
			}
		})
		.map(({ userName, firstName, lastName }) => {
			return {
				user_name: userName,
				first_name: firstName,
				last_name: lastName,
				email: `${userName}@example.com`,
				timezone: "Asia/Tokyo",
				language: "ja",
				is_active: getRandomBoolean(0.9),
			}
		})

	const records = await prisma.user.createMany({ data: users })

	console.info(`>> user records created: ${records.count}`)

	return await prisma.user.findMany()
}
