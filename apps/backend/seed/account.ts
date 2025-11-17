import type { Prisma, user } from "@prisma/client"
import { addresses } from "./static/address"
import {
	getAnyRow,
	getRandomBoolean,
	getRandomInteger,
	getZeroPaddingString,
} from "./utility"

export async function seedAccounts(
	prisma: Prisma.TransactionClient,
	users: user[],
) {
	const entity = await prisma.entity.findUniqueOrThrow({
		where: { name: "account" },
	})

	const entityItems = await prisma.entity_item.findMany({
		where: { entity_id: entity.id },
	})

	const entityItemOptions = await prisma.entity_item_option.findMany({
		where: { entity_item_id: { in: entityItems.map(({ id }) => id) } },
	})

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

	const accounts: Prisma.accountCreateManyInput[] = Array.from({
		length: 2000,
	}).map((_, index) => {
		const code = getZeroPaddingString(index + 1, 6)
		const user = getAnyRow(users)
		const userRecordReference = JSON.stringify({
			entity_name: "user",
			id: user.id,
		})
		const address = getAnyRow(addresses)

		return {
			name: `株式会社 ${code}`,
			account_number: getRandomBoolean(0.9) ? `ACC-${code}` : null,
			main_phone_number: getRandomBoolean(0.9)
				? `00-0000-${getZeroPaddingString(index + 1, 4)}`
				: null,
			sub_phone_number: getRandomBoolean(0.9)
				? `99-9999-${getZeroPaddingString(index + 1, 4)}`
				: null,
			website: getRandomBoolean(0.9) ? `https://site.${code}.com` : null,
			industry: getRandomBoolean(0.9)
				? JSON.stringify([getAnyOption("industry").name])
				: null,
			number_of_employees: getRandomBoolean(0.9)
				? getRandomInteger(10, 1000)
				: null,
			revenue: getRandomBoolean(0.9)
				? getRandomInteger(1, 1000) * 10_000_000
				: null,
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
			market_cap: getRandomBoolean(0.9)
				? getRandomInteger(1, 1000) * 100_000_000
				: null,
			description: getRandomBoolean(0.9) ? `description ${code}` : null,
			originating_lead: getRandomBoolean(0.1)
				? JSON.stringify({ entity_name: "lead", id: getAnyRow(leads).id })
				: null,
			parent: null,
			is_deleted: false,
			owner: userRecordReference,
			created_by: userRecordReference,
			modified_by: userRecordReference,
		}
	})

	const records = await prisma.account.createMany({ data: accounts })

	console.log(`>> account records created: ${records.count}`)

	return records
}

export async function seedAccountsParent(prisma: Prisma.TransactionClient) {
	const targetAccounts = await prisma.account.findMany({
		where: {
			market_cap: {
				gte: 0,
			},
		},
		take: 20,
		orderBy: [{ market_cap: "asc" }],
	})

	const parentAccounts = await prisma.account.findMany({
		where: {
			id: {
				notIn: targetAccounts.map(({ id }) => id),
			},
		},
		take: 20,
		orderBy: [{ market_cap: "desc" }],
	})

	const result = await Promise.all(
		targetAccounts.map((target) => {
			return prisma.account.update({
				where: {
					id: target.id,
				},
				data: {
					parent: JSON.stringify({
						entity_name: "account",
						id: getAnyRow(parentAccounts).id,
					}),
				},
			})
		}),
	)

	console.log(`>> account records updated: ${result.length}`)
}
