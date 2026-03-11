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
	const contacts = await prisma.contact.findMany({
		where: {
			account: {
				in: accounts.map(({ id }) =>
					JSON.stringify({ entity_name: "account", id }),
				),
			},
		},
	})
	const accountIdToContactIdMap = new Map<string, string[]>()
	for (const contact of contacts) {
		const account = JSON.parse(contact.account || "{}")
		if (account.id) {
			if (!accountIdToContactIdMap.has(account.id)) {
				accountIdToContactIdMap.set(account.id, [])
			}
			accountIdToContactIdMap.get(account.id)?.push(contact.id)
		}
	}
	const getAnyTargetAndContact = () => {
		if (getRandomBoolean(0.9)) {
			if (getRandomBoolean(0.5)) {
				const account = getAnyRow(accounts)
				const contactId = getAnyRow(
					accountIdToContactIdMap.get(account.id) || [],
				)
				return {
					target: { entity_name: "account", id: account.id },
					contact: contactId ? { entity_name: "contact", id: contactId } : null,
				}
			}
			const lead = getAnyRow(leads)
			return {
				target: { entity_name: "lead", id: lead.id },
				contact: null,
			}
		}
		return { target: null, contact: null }
	}

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
		const { target, contact } = getAnyTargetAndContact()
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
			target: target ? JSON.stringify(target) : null,
			contact: contact ? JSON.stringify(contact) : null,
			start_date_time: startDateTime,
			end_date_time: endDateTime,
			is_all_day_event: false,
			status: getRandomBoolean(0.9)
				? JSON.stringify([getAnyOption("status").name])
				: null,
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

async function findLatLng(
	prisma: Prisma.TransactionClient,
	target: { entity_name: string; id: string },
) {
	if (["account", "lead"].includes(target.entity_name)) {
		const query = `SELECT [location].[Lat] as latitude, [location].[Long] as longitude
			FROM [${target.entity_name}]
			WHERE [id] = '${target.id}'`

		const result =
			await prisma.$queryRawUnsafe<{ latitude: number; longitude: number }[]>(
				query,
			)
		if (result.length > 0) {
			return result[0]
		}
	}
	return { latitude: null, longitude: null }
}

export async function seedActivitiesTimeAndLatLong(
	prisma: Prisma.TransactionClient,
) {
	const activities = await prisma.activity.findMany()
	const now = date()

	const result = await Promise.all(
		activities
			.map(async (activity) => {
				// 過去の活動を9割の確率で実績日時と緯度経度を設定
				if (
					activity.start_date_time &&
					activity.start_date_time <= now &&
					activity.end_date_time &&
					activity.end_date_time <= now &&
					getRandomBoolean(0.9)
				) {
					const actual_start_date_time = getRandomDate(
						addMinute(activity.start_date_time, -30),
						addMinute(activity.start_date_time, 30),
					)
					const actual_end_date_time = getRandomDate(
						addMinute(activity.end_date_time, -30),
						addMinute(activity.end_date_time, 30),
					)
					const { latitude, longitude } = await findLatLng(
						prisma,
						JSON.parse(activity.target ?? "{}"),
					)

					const start_latitude = latitude
						? latitude + getRandomInteger(-1000, 1000) * 0.000001
						: null
					const start_longitude = longitude
						? longitude + getRandomInteger(-1000, 1000) * 0.000001
						: null
					const finish_latitude = latitude
						? latitude + getRandomInteger(-1000, 1000) * 0.000001
						: null
					const finish_longitude = longitude
						? longitude + getRandomInteger(-1000, 1000) * 0.000001
						: null
					const working_latitude = latitude
						? latitude + getRandomInteger(-1000, 1000) * 0.000001
						: null
					const working_longitude = longitude
						? longitude + getRandomInteger(-1000, 1000) * 0.000001
						: null

					return prisma.activity.update({
						where: { id: activity.id },
						data: {
							actual_start_date_time,
							actual_end_date_time,
							start_latitude,
							start_longitude,
							finish_latitude,
							finish_longitude,
							working_latitude,
							working_longitude,
						},
					})
				}
				return null
			})
			.filter((result) => result !== null),
	)
	console.info(`>> activity records updated: ${result.length}`)
}
