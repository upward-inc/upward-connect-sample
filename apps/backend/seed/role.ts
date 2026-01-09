import type { Prisma } from "@prisma/client"

type RoleSnippet = Omit<
	Prisma.roleCreateManyInput,
	"order" | "created_by" | "modified_by"
> & {
	children?: RoleSnippet[]
}

export async function seedRoles(
	prisma: Prisma.TransactionClient,
	adminUserId: string,
) {
	const roles: RoleSnippet[] = [
		{ id: crypto.randomUUID(), name: "ceo", display_name: "CEO" },
		{
			id: crypto.randomUUID(),
			name: "human_resource_department",
			display_name: "人事部",
		},
		{
			id: crypto.randomUUID(),
			name: "sales_department",
			display_name: "営業本部",
			children: [
				{
					id: crypto.randomUUID(),
					name: "east_japan_sales_department",
					display_name: "東日本営業部",
					children: [
						{
							id: crypto.randomUUID(),
							name: "hokkaido_tohoku_branch",
							display_name: "北海道・東北支社",
						},
						{
							id: crypto.randomUUID(),
							name: "kanto_branch",
							display_name: "関東支社 ",
						},
					],
				},
				{
					id: crypto.randomUUID(),
					name: "central_japan_sales_department",
					display_name: "中日本営業部",
					children: [
						{
							id: crypto.randomUUID(),
							name: "koushinetsu_branch",
							display_name: "甲信越支社",
						},
						{
							id: crypto.randomUUID(),
							name: "hokuriku_branch",
							display_name: "北陸支社 ",
						},
						{
							id: crypto.randomUUID(),
							name: "tokai_branch",
							display_name: "東海支社",
						},
					],
				},
				{
					id: crypto.randomUUID(),
					name: "west_japan_sales_department",
					display_name: "西日本営業部",
					children: [
						{
							id: crypto.randomUUID(),
							name: "kansai_branch",
							display_name: "関西支社",
						},
						{
							id: crypto.randomUUID(),
							name: "chugoku_shikoku_branch",
							display_name: "中国・四国支社 ",
						},
						{
							id: crypto.randomUUID(),
							name: "kyushu_okinawa_branch",
							display_name: "九州・沖縄支社",
						},
					],
				},
			],
		},
	]

	async function createRolesRecursively(
		roles: RoleSnippet[],
		parentId: string | null = null,
		startOrder = 1,
	): Promise<number> {
		let currentOrder = startOrder

		const data = roles.map((role) => {
			const { children, ...rest } = role
			return {
				...rest,
				parent_id: parentId,
				order: currentOrder++,
				created_by: adminUserId,
				modified_by: adminUserId,
			}
		})

		await prisma.role.createMany({ data: data })

		// 子ロールを処理
		for (const role of roles) {
			if (role.children?.length) {
				currentOrder = await createRolesRecursively(
					role.children,
					role.id,
					currentOrder,
				)
			}
		}

		return currentOrder
	}

	await createRolesRecursively(roles)
}
