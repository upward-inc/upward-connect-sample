import { prisma } from "../../libs/prisma"
import {
	type EntityList,
	EntityListSchema,
	EntityTypeEnum,
} from "../../schema/entity"

export const getEntityList = async (): Promise<EntityList> => {
	const result = await prisma.entity
		.findMany({
			orderBy: [{ order: "asc" }],
		})
		.then((results) => {
			return results.map((result) => ({
				name: result.name,
				type: EntityTypeEnum.includes(
					result.name as (typeof EntityTypeEnum)[number],
				)
					? (result.name as (typeof EntityTypeEnum)[number])
					: null,
				display_name: result.display_name,
				record_url_format: {
					app: `http://url-test.app.localhost/records/${result.name}/{id}`,
					browser: `http://url-test.browser.localhost/records/${result.name}/{id}`,
				},
				has_location: result.has_location,
				item_mapping: {
					// このサンプルにおいては、すべてのエンティティのIDフィールド名は`id`として統一する
					id: "id",
					title: result.title_field_name,
					// このサンプルにおいては、user以外すべてのエンティティの所有者フィールド名は`owner`として統一する
					owner: result.name !== "user" ? "owner" : null,
					// このサンプルにおいては、すべてのエンティティの作成日時フィールド名は`created_at`として統一する
					created_at: "created_at",
					// このサンプルにおいては、user以外すべてのエンティティの作成者フィールド名は`created_by`として統一する
					created_by: result.name !== "user" ? "created_by" : null,
					// このサンプルにおいては、すべてのエンティティの最終更新日時フィールド名は`modified_at`として統一する
					modified_at: "modified_at",
					// このサンプルにおいては、user以外すべてのエンティティの最終更新者フィールド名は`modified_by`として統一する
					modified_by: result.name !== "user" ? "modified_by" : null,
					// このサンプルにおいては、locationフィールドが存在するエンティティの緯度フィールド名は`latitude`として統一する
					latitude: result.has_location ? "latitude" : null,
					// このサンプルにおいては、locationフィールドが存在するエンティティの経度フィールド名は`longitude`として統一する
					longitude: result.has_location ? "longitude" : null,
				},
			}))
		})
	return EntityListSchema.parse(result)
}
