import { PrismaClient } from "@prisma/client"
import {
	seedAccounts,
	seedAccountsAddressAndLocation,
	seedAccountsParent,
} from "./account"
import { seedActivities } from "./activity"
import { seedCampaigns } from "./campaign"
import { seedCases } from "./case"
import { seedContacts } from "./contact"
import { seedEntities } from "./entity"
import { seedEntityItems } from "./entity-item"
import { seedEntityItemOptions } from "./entity-item-option"
import { seedJwkPrivateKeys } from "./jwk-private-key"
import { seedLeads, seedLeadsAddressAndLocation } from "./lead"
import { seedOauthClients } from "./oauth-client"
import { seedOpportunities } from "./opportunity"
import { seedPhoneCalls } from "./phone-call"
import { seedProducts } from "./product"
import { seedProfiles } from "./profile"
import { seedRoles } from "./role"
import { seedSamples, seedSamplesAddressAndLocation } from "./sample"
import { seedUsers } from "./user"
import { seedUserAccessControls } from "./user-access-control"

const prisma = new PrismaClient()

try {
	console.info("starting seed execution...")

	await prisma.$transaction(
		async (txClient) => {
			// 依存関係を考慮した順番でレコード削除
			await txClient.sample.deleteMany()
			await txClient.opportunity.deleteMany()
			await txClient.phone_call.deleteMany()
			await txClient.activity.deleteMany()
			await txClient.campaign.deleteMany()
			await txClient.product.deleteMany()
			await txClient.renamedcase.deleteMany()
			await txClient.contact.deleteMany()
			await txClient.account.deleteMany()
			await txClient.lead.deleteMany()
			await txClient.entity_item_option.deleteMany()
			await txClient.entity_item.deleteMany()
			await txClient.entity.deleteMany()
			await txClient.user_access_control.deleteMany()
			await txClient.role.deleteMany()
			await txClient.profile.deleteMany()
			await txClient.user.deleteMany()
			await txClient.oauth_client.deleteMany()
			await txClient.jwk_private_key.deleteMany()

			// OAuthクライアント
			await seedOauthClients(txClient)

			// Jwk秘密鍵
			await seedJwkPrivateKeys(txClient)

			// system users
			const users = await seedUsers(txClient)
			const adminUser = users.at(0)
			if (!adminUser) {
				throw new Error("admin user not found")
			}

			// プロファイル
			await seedProfiles(txClient, adminUser.id)

			// ロール
			await seedRoles(txClient, adminUser.id)

			// ユーザーアクセスコントロール
			await seedUserAccessControls(txClient, users, adminUser.id)

			// エンティティ
			await seedEntities(txClient, users)

			// エンティティ項目
			await seedEntityItems(txClient)

			// エンティティ項目オプション
			await seedEntityItemOptions(txClient)

			// リード
			await seedLeads(txClient, users)
			await seedLeadsAddressAndLocation(txClient)

			// 取引先
			await seedAccounts(txClient, users)
			await seedAccountsAddressAndLocation(txClient)
			await seedAccountsParent(txClient)

			// 取引先担当者
			await seedContacts(txClient, users)

			// ケース
			await seedCases(txClient, users)

			// 製品
			await seedProducts(txClient, users)

			// キャンペーン
			await seedCampaigns(txClient, users)

			// 活動
			await seedActivities(txClient, users)

			// 通話
			await seedPhoneCalls(txClient, users)

			// 商談
			await seedOpportunities(txClient, users)

			// サンプル
			await seedSamples(txClient, users)
			await seedSamplesAddressAndLocation(txClient)
		},
		{
			timeout: 1000 * 60,
		},
	)

	console.info("seed execution completed")
} catch (error) {
	console.error("error occurred during seed execution:", error)
	process.exit(1)
} finally {
	await prisma.$disconnect()
}
