import { addYear, date, format } from "@formkit/tempo"
import type { Prisma, user } from "@prisma/client"
import { addresses } from "./static/address"
import {
	distinctBy,
	getAnyRow,
	getRandomBoolean,
	getRandomDate,
	getRandomInteger,
	getZeroPaddingString,
} from "./utility"

export async function seedSamples(
	prisma: Prisma.TransactionClient,
	users: user[],
) {
	const entity = await prisma.entity.findUniqueOrThrow({
		where: { name: "sample" },
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

	const samples: Prisma.sampleCreateManyInput[] = Array.from({
		length: 100,
	}).map((_, index) => {
		const code = getZeroPaddingString(index + 1, 6)
		const user = getAnyRow(users)
		const userRecordReference = JSON.stringify({
			entity_name: "user",
			id: user.id,
		})

		const anyDate = getRandomDate(addYear(date(), -2), addYear(date(), 1))

		const getOptionSingle = () => {
			if (getRandomBoolean(0.1)) {
				return null
			}
			if (getRandomBoolean(0.1)) {
				return "[]"
			}
			return JSON.stringify([getAnyOption("option_single").name])
		}

		const getOptionMulti = () => {
			if (getRandomBoolean(0.1)) {
				return null
			}
			if (getRandomBoolean(0.1)) {
				return "[]"
			}
			return JSON.stringify(
				distinctBy(
					[
						{ name: getAnyOption("option_multi").name },
						{ name: getAnyOption("option_multi").name },
						{ name: getAnyOption("option_multi").name },
					],
					({ name }) => name,
				)
					.map(({ name }) => name)
					.sort((a, b) => a.localeCompare(b)),
			)
		}

		const getReferenceSingleTargetSingleId = () => {
			if (getRandomBoolean(0.1)) {
				return null
			}
			return JSON.stringify({
				entity_name: "account",
				id: getAnyRow(accounts).id,
			})
		}

		const getReferenceSingleTargetMultiId = () => {
			if (getRandomBoolean(0.1)) {
				return null
			}
			if (getRandomBoolean(0.1)) {
				return "[]"
			}
			return JSON.stringify([
				{ entity_name: "account", id: getAnyRow(accounts).id },
				{ entity_name: "account", id: getAnyRow(accounts).id },
			])
		}

		const getReferenceMultiTargetSingleId = () => {
			if (getRandomBoolean(0.1)) {
				return null
			}
			if (getRandomBoolean(0.5)) {
				return JSON.stringify({
					entity_name: "account",
					id: getAnyRow(accounts).id,
				})
			}
			return JSON.stringify({ entity_name: "lead", id: getAnyRow(leads).id })
		}

		const getReferenceMultiTargetMultiId = () => {
			if (getRandomBoolean(0.1)) {
				return null
			}
			if (getRandomBoolean(0.1)) {
				return "[]"
			}
			return JSON.stringify(
				distinctBy(
					[
						{ entity_name: "account", id: getAnyRow(accounts).id },
						{ entity_name: "account", id: getAnyRow(accounts).id },
						{ entity_name: "lead", id: getAnyRow(leads).id },
						{ entity_name: "lead", id: getAnyRow(leads).id },
					],
					({ entity_name, id }) => `${entity_name}:${id}`,
				),
			)
		}

		return {
			name: `Sample ${code}`,
			text: getRandomBoolean(0.9) ? "text" : null,
			textarea: getRandomBoolean(0.9)
				? "textarea1\ntextarea2\ntextarea3"
				: null,
			phone_number: getRandomBoolean(0.9)
				? `00-0000-${getZeroPaddingString(index + 1, 4)}`
				: null,
			email: getRandomBoolean(0.9) ? `mail@${code}.com` : null,
			url: getRandomBoolean(0.9) ? `https://sample.${code}.com` : null,
			combobox: getRandomBoolean(0.9) ? "combobox" : null,
			integer: getRandomBoolean(0.9) ? getRandomInteger(1, 10000) : null,
			decimal: getRandomBoolean(0.9) ? getRandomInteger(1, 10000) / 100 : null,
			boolean: getRandomBoolean(0.5),
			date: getRandomBoolean(0.9)
				? format({
						date: anyDate,
						format: "YYYY-MM-DDTHH:mm:ssZ",
						tz: "Asia/Tokyo",
					})
				: null,
			datetime: getRandomBoolean(0.9)
				? format({
						date: anyDate,
						format: "YYYY-MM-DDTHH:mm:ssZ",
						tz: "Asia/Tokyo",
					})
				: null,
			time: getRandomBoolean(0.9)
				? format({
						date: anyDate,
						format: "YYYY-MM-DDTHH:mm:ssZ",
						tz: "Asia/Tokyo",
					})
				: null,
			option_single: getOptionSingle(),
			option_multi: getOptionMulti(),
			reference_single_target_single_id: getReferenceSingleTargetSingleId(),
			reference_single_target_multi_id: getReferenceSingleTargetMultiId(),
			reference_multi_target_single_id: getReferenceMultiTargetSingleId(),
			reference_multi_target_multi_id: getReferenceMultiTargetMultiId(),
			owner: userRecordReference,
			created_by: userRecordReference,
			modified_by: userRecordReference,
		}
	})

	const records = await prisma.sample.createMany({ data: samples })

	console.info(`>> sample records created: ${records.count}`)

	return records
}

export async function seedSamplesAddressAndLocation(
	prisma: Prisma.TransactionClient,
) {
	const records = await prisma.sample.findMany()

	const result = await Promise.all(
		records.map((record) => {
			if (getRandomBoolean(0.9)) {
				const address = getAnyRow(addresses)

				const query = `
					UPDATE [sample]
					SET [address_zipcode] = N'${address.zipcode}',
						[address_prefecture] = N'${address.prefecture}',
						[address_municipality] = N'${address.municipality}',
						[address_street] = N'${address.street}',
						[location] = geography::Point(${address.latitude}, ${address.longitude}, 4326)
					WHERE [id] = '${record.id}'
				`

				return prisma.$executeRawUnsafe(query)
			}
		}),
	)
	console.log(`>> sample records updated: ${result.length}`)
}
