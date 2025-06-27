import { PrismaClient } from "@prisma/client"

async function main() {
	const prisma = new PrismaClient()

	try {
		// キャンペーンのカウント
		const campaignCount = await prisma.campaign.count()
		console.log(`キャンペーン数: ${campaignCount}`)

		// ユーザー数
		const userCount = await prisma.user.count()
		console.log(`ユーザー数: ${userCount}`)

		// キャンペーンデータを取得
		if (campaignCount > 0) {
			const campaigns = await prisma.campaign.findMany({ take: 5 })
			console.log("最初の5つのキャンペーン:")
			campaigns.forEach((campaign) => {
				console.log(`- ID: ${campaign.id}, 名前: ${campaign.name}`)
			})
		}

		// 他のテーブルも確認
		const accountCount = await prisma.account.count()
		const contactCount = await prisma.contact.count()
		const productCount = await prisma.product.count()

		console.log("テーブル件数:")
		console.log(`- account: ${accountCount}`)
		console.log(`- contact: ${contactCount}`)
		console.log(`- product: ${productCount}`)
	} catch (error) {
		console.error("エラーが発生しました:", error)
	} finally {
		await prisma.$disconnect()
	}
}

main()
