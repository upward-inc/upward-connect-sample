import type { Prisma, user } from "@prisma/client"
import { date, format, addYear, monthStart, monthEnd } from "@formkit/tempo"
import {
	getAnyRow,
	getZeroPaddingString,
	getRandomInteger,
	getRandomBoolean,
	getRandomDate,
} from "./utility"

export async function seedCampaigns(
	prisma: Prisma.TransactionClient,
	users: user[],
) {
	const entity = await prisma.entity.findUniqueOrThrow({
		where: { name: "campaign" },
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

	const campaigns: Prisma.campaignCreateManyInput[] = Array.from({
		length: 100,
	}).map((_, index) => {
		const code = getZeroPaddingString(index + 1, 6)
		const user = getAnyRow(users)
		const userRecordReference = JSON.stringify({ entity: "user", id: user.id })

		const anyDate = getRandomDate(addYear(date(), -2), addYear(date(), 1))

		const startDate = format({
			date: monthStart(anyDate),
			format: "YYYY-MM-DDTHH:mm:ssZ",
			tz: "Asia/Tokyo",
		})
		const endDate = format({
			date: monthEnd(anyDate),
			format: "YYYY-MM-DDTHH:mm:ssZ",
			tz: "Asia/Tokyo",
		})

		return {
			name: `キャンペーン ${code}`,
			code: code,
			type: getRandomBoolean(0.9)
				? JSON.stringify([getAnyOption("type").name])
				: null,
			start_date: startDate,
			end_date: endDate,
			description: getRandomBoolean(0.9) ? `description ${code}` : null,
			expected_response: getRandomBoolean(0.9)
				? getRandomInteger(1, 10) / 10
				: null,
			budgeted_cost: getRandomBoolean(0.9)
				? getRandomInteger(1, 1000) * 1000
				: null,
			expected_revenue: getRandomBoolean(0.9)
				? getRandomInteger(1, 1000) * 10000
				: null,
			status: getRandomBoolean(0.9)
				? JSON.stringify([getAnyOption("status").name])
				: null,
			is_deleted: false,
			owner: userRecordReference,
			created_by: userRecordReference,
			modified_by: userRecordReference,
		}
	})

	const records = await prisma.campaign.createMany({ data: campaigns })

	console.info(`>> campaign records created: ${records.count}`)

	return records
}
