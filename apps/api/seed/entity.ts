import type { Prisma, user } from "@prisma/client"
import { getAnyRow } from "./utility"

export async function seedEntities(
	prisma: Prisma.TransactionClient,
	users: user[],
) {
	const entities = [
		{ name: "user", display_name: "ユーザー", title_field_name: "full_name" },
		{ name: "account", display_name: "取引先", title_field_name: "name" },
		{ name: "lead", display_name: "リード", title_field_name: "full_name" },
		{ name: "activity", display_name: "活動", title_field_name: "subject" },
		{ name: "phone_call", display_name: "通話", title_field_name: "subject" },
		{
			name: "contact",
			display_name: "取引先責任者",
			title_field_name: "full_name",
		},
		{ name: "opportunity", display_name: "商談", title_field_name: "name" },
		{ name: "case", display_name: "ケース", title_field_name: "subject" },
		{ name: "product", display_name: "製品", title_field_name: "name" },
		{
			name: "campaign",
			display_name: "キャンペーン",
			title_field_name: "name",
		},
		{ name: "sample", display_name: "サンプル", title_field_name: "name" },
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
