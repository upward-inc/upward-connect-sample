import type { Prisma, user } from "@prisma/client"
import {
	getAnyRow,
	getRandomBoolean,
	getUniquePersons,
	getZeroPaddingString,
} from "./utility"

export async function seedContacts(
	prisma: Prisma.TransactionClient,
	users: user[],
) {
	const entity = await prisma.entity.findUniqueOrThrow({
		where: { name: "contact" },
	})

	const entityItems = await prisma.entity_item.findMany({
		where: { entity_id: entity.id },
	})

	const entityItemOptions = await prisma.entity_item_option.findMany({
		where: { entity_item_id: { in: entityItems.map(({ id }) => id) } },
	})

	const accounts = await prisma.account.findMany()
	const leads = await prisma.lead.findMany()

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

	const contacts: Prisma.contactCreateManyInput[] = Array.from({
		length: 100,
	}).map((_, index) => {
		const code = getZeroPaddingString(index + 1, 6)
		const user = getAnyRow(users)
		const person = getAnyRow(persons)
		const account = getAnyRow(accounts)
		const userRecordReference = JSON.stringify({
			entity_name: "user",
			id: user.id,
		})

		return {
			first_name: person.firstName.value,
			last_name: person.lastName.value,
			gender: JSON.stringify([getAnyOption("gender").name]),
			account: JSON.stringify({ entity_name: "account", id: account.id }),
			business_unit: getRandomBoolean(0.9) ? `部署 ${code}` : null,
			title: getRandomBoolean(0.9) ? `役職 ${code}` : null,
			company_phone_number: getRandomBoolean(0.9)
				? `00-0000-${getZeroPaddingString(index + 1, 4)}`
				: null,
			mobile_phone_number: getRandomBoolean(0.9)
				? `080-9999-${getZeroPaddingString(index + 1, 4)}`
				: null,
			email: getRandomBoolean(0.9) ? `mail@${code}.com` : null,
			website: getRandomBoolean(0.9) ? `https://site.${code}.com` : null,
			originating_lead: getRandomBoolean(0.1)
				? JSON.stringify({ entity_name: "lead", id: getAnyRow(leads).id })
				: null,
			description: getRandomBoolean(0.9) ? `description ${code}` : null,
			is_deleted: false,
			owner: userRecordReference,
			created_by: userRecordReference,
			modified_by: userRecordReference,
		}
	})

	const records = await prisma.contact.createMany({ data: contacts })

	console.info(`>> contact records created: ${records.count}`)

	return records
}
