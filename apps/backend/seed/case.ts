import { addYear, date, format } from "@formkit/tempo"
import type { Prisma, user } from "@prisma/client"
import {
	getAnyRow,
	getRandomBoolean,
	getRandomDate,
	getZeroPaddingString,
} from "./utility"

export async function seedCases(
	prisma: Prisma.TransactionClient,
	users: user[],
) {
	const entity = await prisma.entity.findUniqueOrThrow({
		where: { name: "case" },
	})

	const entityItems = await prisma.entity_item.findMany({
		where: { entity_id: entity.id },
	})

	const entityItemOptions = await prisma.entity_item_option.findMany({
		where: { entity_item_id: { in: entityItems.map(({ id }) => id) } },
	})

	const accounts = await prisma.account.findMany()
	const contacts = await prisma.contact.findMany()

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

	const cases: Prisma.RenamedcaseCreateManyInput[] = Array.from({
		length: 100,
	}).map((_, index) => {
		const code = getZeroPaddingString(index + 1, 6)
		const user = getAnyRow(users)
		const account = getAnyRow(accounts)
		const contact = getAnyRow(contacts)
		const userRecordReference = JSON.stringify({
			entity_name: "user",
			id: user.id,
		})

		const anyDate = getRandomDate(addYear(date(), -2), addYear(date(), 1))

		return {
			case_number: code,
			subject: `ケース ${code}`,
			detail: getRandomBoolean(0.9) ? `detail ${code}` : null,
			contact: JSON.stringify({ entity_name: "contact", id: contact.id }),
			account: JSON.stringify({ entity_name: "account", id: account.id }),
			parent: null,
			type: getRandomBoolean(0.9)
				? JSON.stringify([getAnyOption("type").name])
				: null,
			status: getRandomBoolean(0.9)
				? JSON.stringify([getAnyOption("status").name])
				: null,
			reason: getRandomBoolean(0.9)
				? JSON.stringify([getAnyOption("reason").name])
				: null,
			origin: getRandomBoolean(0.9)
				? JSON.stringify([getAnyOption("origin").name])
				: null,
			priority: getRandomBoolean(0.9)
				? JSON.stringify([getAnyOption("priority").name])
				: null,
			is_escalated: getRandomBoolean(0.5),
			closed_datetime: getRandomBoolean(0.9)
				? format({
						date: anyDate,
						format: "YYYY-MM-DDTHH:mm:ssZ",
						tz: "Asia/Tokyo",
					})
				: null,
			description: getRandomBoolean(0.9) ? `description ${code}` : null,
			is_deleted: false,
			owner: userRecordReference,
			created_by: userRecordReference,
			modified_by: userRecordReference,
		}
	})

	const records = await prisma.renamedcase.createMany({ data: cases })

	console.info(`>> case records created: ${records.count}`)

	return records
}
