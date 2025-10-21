import { addMinute, addYear, date, format } from "@formkit/tempo"
import type { Prisma, user } from "@prisma/client"
import {
	getAnyRow,
	getRandomBoolean,
	getRandomDate,
	getRandomInteger,
	getZeroPaddingString,
} from "./utility"

export async function seedActivities(
	prisma: Prisma.TransactionClient,
	users: user[],
) {
	const entity = await prisma.entity.findUniqueOrThrow({
		where: { name: "activity" },
	})

	const entityItems = await prisma.entity_item.findMany({
		where: { entity_id: entity.id },
	})

	const entityItemOptions = await prisma.entity_item_option.findMany({
		where: { entity_item_id: { in: entityItems.map(({ id }) => id) } },
	})

	const accounts = await prisma.account.findMany()
	const leads = await prisma.lead.findMany()
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

	const activities: Prisma.activityCreateManyInput[] = Array.from({
		length: 200,
	}).map((_, index) => {
		const code = getZeroPaddingString(index + 1, 6)
		const user = getAnyRow(users)
		const account = getAnyRow(accounts)
		const lead = getAnyRow(leads)
		const contact = getAnyRow(contacts)
		const userRecordReference = JSON.stringify({
			entity_name: "user",
			id: user.id,
		})

		const anyDate = getRandomDate(addYear(date(), -2), addYear(date(), 1))
		const anyWorktimeHour = getRandomInteger(9, 18)

		const startDateTime = format({
			date: anyDate,
			format: `YYYY-MM-DDT${getZeroPaddingString(anyWorktimeHour, 2)}:mm:00Z`,
			tz: "Asia/Tokyo",
		})
		const endDateTime = format({
			date: addMinute(startDateTime, 30),
			format: "YYYY-MM-DDTHH:mm:ssZ",
			tz: "Asia/Tokyo",
		})

		return {
			subject: getAnyOption("subject").display_name,
			target: getRandomBoolean(0.9)
				? JSON.stringify(
						getRandomBoolean(0.5)
							? { entity_name: "account", id: account.id }
							: getRandomBoolean(0.5)
								? { entity_name: "lead", id: lead.id }
								: { entity_name: "contact", id: contact.id },
					)
				: null,
			start_date_time: startDateTime,
			end_date_time: endDateTime,
			is_all_day_event: false,
			status: getRandomBoolean(0.9)
				? JSON.stringify([getAnyOption("status").name])
				: null,
			location: `${account.address_prefecture ?? ""}${account.address_municipality ?? ""}${account.address_street ?? ""}`,
			required_attendees: null,
			optional_attendees: null,
			organizer: null,
			meeting_url: getRandomBoolean(0.1)
				? `https://sample-meeting-service.com?id=${code}`
				: null,
			description: getRandomBoolean(0.9) ? `description ${code}` : null,
			is_archived: false,
			is_deleted: false,
			owner: userRecordReference,
			created_by: userRecordReference,
			modified_by: userRecordReference,
		}
	})

	const records = await prisma.activity.createMany({ data: activities })

	console.info(`>> activity records created: ${records.count}`)

	return records
}
