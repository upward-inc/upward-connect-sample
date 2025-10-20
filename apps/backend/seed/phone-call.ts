import { addMinute, addYear, date, format } from "@formkit/tempo"
import type { Prisma, user } from "@prisma/client"
import {
	getAnyRow,
	getRandomBoolean,
	getRandomDate,
	getRandomInteger,
	getZeroPaddingString,
} from "./utility"

export async function seedPhoneCalls(
	prisma: Prisma.TransactionClient,
	users: user[],
) {
	const entity = await prisma.entity.findUniqueOrThrow({
		where: { name: "phone_call" },
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

	const phoneCalls: Prisma.phone_callCreateManyInput[] = Array.from({
		length: 200,
	}).map((_, index) => {
		const code = getZeroPaddingString(index + 1, 6)

		const user = getAnyRow(users)
		const account = getAnyRow(accounts)
		const lead = getAnyRow(leads)
		const contact = getAnyRow(contacts)
		const userRecordReference = JSON.stringify({ entity: "user", id: user.id })

		const status = getAnyOption(
			"status",
			getRandomBoolean(0.8) ? "connected" : "missed",
		)

		const anyDate = getRandomDate(addYear(date(), -2), date())

		const anyWorktimeHour = getRandomInteger(9, 18)

		const startDateTime = format({
			date: anyDate,
			format: `YYYY-MM-DDT${getZeroPaddingString(anyWorktimeHour, 2)}:mm:ssZ`,
			tz: "Asia/Tokyo",
		})
		const endDateTime = format({
			date: addMinute(startDateTime, 30),
			format: "YYYY-MM-DDTHH:mm:ssZ",
			tz: "Asia/Tokyo",
		})

		const their = getRandomBoolean(0.5)
			? {
					reference: { entity: "account", id: account.id },
					phoneNumber: account.main_phone_number,
				}
			: getRandomBoolean(0.5)
				? {
						reference: { entity: "lead", id: lead.id },
						phoneNumber: lead.phone_number,
					}
				: {
						reference: { entity: "contact", id: contact.id },
						phoneNumber: contact.mobile_phone_number,
					}

		return {
			subject: status.display_name,
			user: userRecordReference,
			their: JSON.stringify(their.reference),
			phone_number: their.phoneNumber,
			direction: JSON.stringify([getAnyOption("direction").name]),
			start_date_time: startDateTime,
			end_date_time: endDateTime,
			status: JSON.stringify([status.name]),
			description: getRandomBoolean(0.9) ? `description ${code}` : null,
			is_deleted: false,
			owner: userRecordReference,
			created_by: userRecordReference,
			modified_by: userRecordReference,
		}
	})

	const records = await prisma.phone_call.createMany({
		data: phoneCalls,
	})

	console.info(`>> phone_call records created: ${records.count}`)

	return records
}
