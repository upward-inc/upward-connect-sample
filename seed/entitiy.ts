import type { Prisma, user } from "@prisma/client"
import { getAnyRow } from "./utility"

export async function seedEntities(
	prisma: Prisma.TransactionClient,
	users: user[],
) {
	const entities = [
		{ name: "user", display_name: "ユーザー" },
		{ name: "account", display_name: "取引先" },
		{ name: "lead", display_name: "リード" },
		{ name: "activity", display_name: "活動" },
		{ name: "phone_call", display_name: "通話" },
		{ name: "contact", display_name: "取引先責任者" },
		{ name: "opportunity", display_name: "商談" },
		{ name: "case", display_name: "ケース" },
		{ name: "product", display_name: "製品" },
		{ name: "campaign", display_name: "キャンペーン" },
		{ name: "sample", display_name: "サンプル" },
	].map((entity, index) => {
		const user = getAnyRow(users)

		return {
			...entity,
			order: index + 1,
			created_by: user.id,
			modified_by: user.id,
		}
	})

	const records = await prisma.entity.createMany({ data: entities })

	console.info(`>> entity records created: ${records.count}`)

	return await prisma.entity.findMany()
}
