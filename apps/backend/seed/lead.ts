import type { Prisma, user } from "@prisma/client"
import { addresses } from "./static/address"
import {
	getAnyRow,
	getRandomBoolean,
	getRandomInteger,
	getUniquePersons,
	getZeroPaddingString,
} from "./utility"

export async function seedLeads(
	prisma: Prisma.TransactionClient,
	users: user[],
) {
	const entity = await prisma.entity.findUniqueOrThrow({
		where: { name: "lead" },
	})

	const entityItems = await prisma.entity_item.findMany({
		where: { entity_id: entity.id },
	})

	const entityItemOptions = await prisma.entity_item_option.findMany({
		where: { entity_item_id: { in: entityItems.map(({ id }) => id) } },
	})

	const getAnyOption = (itemName: string, name?: string) => {
		const entityItem = entityItems.find((item) => item.name === itemName)
		const itemOptions = entityItemOptions.filter(
			(option) => option.entity_item_id === entityItem?.id,
		)

		const option = name
			? itemOptions.find((option) => option.name === name)
			: getAnyRow(itemOptions)

		if (!option) {
			throw new Error(`option with item name ${itemName} not found`)
		}

		return option
	}

	const persons = getUniquePersons(1000)

	const leads: Prisma.leadCreateManyInput[] = Array.from({ length: 100 }).map(
		(_, index) => {
			const code = getZeroPaddingString(index + 1, 6)
			const user = getAnyRow(users)
			const person = getAnyRow(persons)
			const address = getAnyRow(addresses)
			const userRecordReference = JSON.stringify({
				entity: "user",
				id: user.id,
			})

			return {
				company: `株式会社 ${code}`,
				first_name: person.firstName.value,
				last_name: person.lastName.value,
				business_unit: getRandomBoolean(0.9) ? `部署 ${code}` : null,
				title: getRandomBoolean(0.9) ? `役職 ${code}` : null,
				...(getRandomBoolean(0.9)
					? {
							address_zipcode: address.zipcode,
							address_prefecture: address.prefecture,
							address_municipality: address.municipality,
							address_street: address.street,
							latitude: address.latitude,
							longitude: address.longitude,
						}
					: {}),
				phone_number: getRandomBoolean(0.9)
					? `00-0000-${getZeroPaddingString(index + 1, 4)}`
					: null,
				email: getRandomBoolean(0.9) ? `mail@${code}.com` : null,
				website: getRandomBoolean(0.9) ? `https://site.${code}.com` : null,
				description: getRandomBoolean(0.9) ? `description ${code}` : null,
				lead_source: getRandomBoolean(0.9)
					? JSON.stringify([getAnyOption("lead_source").name])
					: null,
				status: JSON.stringify([getAnyOption("status").name]),
				industry: getRandomBoolean(0.9)
					? JSON.stringify([getAnyOption("industry").name])
					: null,
				rating: getRandomBoolean(0.9)
					? JSON.stringify([getAnyOption("rating").name])
					: null,
				annual_revenue: getRandomBoolean(0.9)
					? getRandomInteger(1, 1000) * 10_000_000
					: null,
				number_of_employees: getRandomBoolean(0.9)
					? getRandomInteger(10, 1000)
					: null,
				is_converted: false,
				// converted_date: null,
				owner: userRecordReference,
				created_by: userRecordReference,
				modified_by: userRecordReference,
			}
		},
	)

	const records = await prisma.lead.createMany({ data: leads })

	console.info(`>> lead records created: ${records.count}`)

	return records
}
