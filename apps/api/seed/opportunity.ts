import type { Prisma, user } from "@prisma/client"
import { date, addYear } from "@formkit/tempo"
import {
	getAnyRow,
	getZeroPaddingString,
	getRandomInteger,
	getRandomBoolean,
	getRandomDate,
} from "./utility"

export async function seedOpportunities(
	prisma: Prisma.TransactionClient,
	users: user[],
) {
	const entity = await prisma.entity.findUniqueOrThrow({
		where: { name: "opportunity" },
	})

	const entityItems = await prisma.entity_item.findMany({
		where: { entity_id: entity.id },
	})

	const entityItemOptions = await prisma.entity_item_option.findMany({
		where: { entity_item_id: { in: entityItems.map(({ id }) => id) } },
	})

	const accounts = await prisma.account.findMany()
	const campaigns = await prisma.campaign.findMany()
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

	const opportunities: Prisma.opportunityCreateManyInput[] = Array.from({
		length: 100,
	}).map((_, index) => {
		const code = getZeroPaddingString(index + 1, 6)
		const user = getAnyRow(users)
		const account = getAnyRow(accounts)
		const campaign = getAnyRow(campaigns)
		const contact = getAnyRow(contacts)
		const userRecordReference = JSON.stringify({ entity: "user", id: user.id })

		return {
			name: `商談 ${code}`,
			account: JSON.stringify({ entity: "account", id: account.id }),
			phase: JSON.stringify([getAnyOption("phase").name]),
			amount: getRandomBoolean(0.9) ? getRandomInteger(1, 1000) * 10000 : null,
			probability: getRandomBoolean(0.9) ? getRandomInteger(1, 10) / 10 : null,
			close_date: getRandomDate(addYear(date(), -2), addYear(date(), 1)),
			type: getRandomBoolean(0.9)
				? JSON.stringify([getAnyOption("type").name])
				: null,
			next_step: getRandomBoolean(0.9) ? `next step ${code}` : null,
			lead_source: getRandomBoolean(0.9)
				? JSON.stringify([getAnyOption("lead_source").name])
				: null,
			campaign: getRandomBoolean(0.9)
				? JSON.stringify({ entity: "campaign", id: campaign.id })
				: null,
			contact: getRandomBoolean(0.9)
				? JSON.stringify({ entity: "contact", id: contact.id })
				: null,
			is_closed: getRandomBoolean(0.2),
			description: getRandomBoolean(0.9) ? `description ${code}` : null,
			is_deleted: false,
			owner: userRecordReference,
			created_by: userRecordReference,
			modified_by: userRecordReference,
		}
	})

	const records = await prisma.opportunity.createMany({ data: opportunities })

	console.info(`>> opportunity records created: ${records.count}`)

	return records
}
