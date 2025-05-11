import type { Prisma, user } from "@prisma/client"
import { getAnyRow, getRandomBoolean, getZeroPaddingString } from "./utility"

export async function seedProducts(
	prisma: Prisma.TransactionClient,
	users: user[],
) {
	const entity = await prisma.entity.findUniqueOrThrow({
		where: { name: "product" },
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

	const products: Prisma.productCreateManyInput[] = Array.from({
		length: 100,
	}).map((_, index) => {
		const code = getZeroPaddingString(index + 1, 6)
		const user = getAnyRow(users)
		const userRecordReference = JSON.stringify({ entity: "user", id: user.id })

		return {
			name: `製品 ${code}`,
			product: code,
			description: getRandomBoolean(0.9) ? `description ${code}` : null,
			is_active: getRandomBoolean(0.9),
			family: getRandomBoolean(0.9)
				? JSON.stringify([getAnyOption("family").name])
				: null,
			external_id: getRandomBoolean(0.9) ? `external id ${code}` : null,
			url: getRandomBoolean(0.9) ? `https://sample-site.com?id=${code}` : null,
			quantity_unit: getRandomBoolean(0.9)
				? JSON.stringify([getAnyOption("quantity_unit").name])
				: null,
			is_archived: getRandomBoolean(0.1),
			is_deleted: false,
			owner: userRecordReference,
			created_by: userRecordReference,
			modified_by: userRecordReference,
		}
	})

	const records = await prisma.product.createMany({ data: products })

	console.info(`>> product records created: ${records.count}`)

	return records
}
