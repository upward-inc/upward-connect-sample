import type { user } from "@prisma/client"
import { seedEntities } from "../../../seed/entity"
import { seedEntityItems } from "../../../seed/entity-item"
import { seedEntityItemOptions } from "../../../seed/entity-item-option"
import { testPrisma } from "../setup"

export type Entity = Awaited<
	ReturnType<typeof testPrisma.entity.findUniqueOrThrow>
>

/**
 * エンティティ関連データのセットアップ（シードデータを使用した初期化）
 */
export async function setupEntityMetadata(user: user): Promise<{
	entities: Entity[]
}> {
	const entities = await seedEntities(testPrisma, [user])
	await seedEntityItems(testPrisma)
	await seedEntityItemOptions(testPrisma)

	return { entities }
}

/**
 * エンティティ関連データのクリーンアップ
 */
export async function cleanupEntityMetadata() {
	await testPrisma.entity_item_option.deleteMany()
	await testPrisma.entity_item.deleteMany()
	await testPrisma.entity.deleteMany()
}
