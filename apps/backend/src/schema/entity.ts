import { z } from "../libs/zod"

const recordUrlFormat = z
	.object({
		app: z.string().nullable().meta({
			description:
				"このエンティティのレコードをモバイルアプリで開く際のURL形式",
			example: "sampleapp://record_detail?entity=account&id={id}",
		}),
		browser: z.string().nullable().meta({
			description:
				"このエンティティのレコードをPC（Webブラウザ）で開く際のURL形式",
			example: "https://example.com/record_detail?entity=account&id={id}",
		}),
	})
	.meta({
		description: "レコードのURLを表す文字列フォーマット",
	})

const itemMapping = z
	.object({
		id: z.string().meta({
			description: "レコードのID（一意識別子）が設定されている項目名",
			example: "id",
		}),
		title: z.string().meta({
			description: "レコードのタイトルが設定されている項目名",
			example: "name",
		}),
		owner: z.string().nullable().meta({
			description:
				"レコードの所有者（ユーザーエンティティへの参照）が設定されている項目名",
			example: "owner",
		}),
		created_at: z.string().nullable().meta({
			description: "レコードの作成日時が設定されている項目名",
			example: "created_at",
		}),
		created_by: z.string().nullable().meta({
			description:
				"レコードの作成者（ユーザーエンティティへの参照）が設定されている項目名",
			example: "created_by",
		}),
		modified_at: z.string().nullable().meta({
			description: "レコードの最終更新日時が設定されている項目名",
			example: "modified_at",
		}),
		modified_by: z.string().nullable().meta({
			description:
				"レコードの最終更新者（ユーザーエンティティへの参照）が設定されている項目名",
			example: "modified_by",
		}),
		latitude: z.string().nullable().meta({
			description: "レコードの緯度が設定されている項目名",
			example: "latitude",
		}),
		longitude: z.string().nullable().meta({
			description: "レコードの経度が設定されている項目名",
			example: "longitude",
		}),
	})
	.meta({
		description: "UPWARDが標準的に扱う項目名のマッピング",
	})

export const EntityTypeEnum = [
	"user",
	"account",
	"lead",
	"contact",
	"activity",
	"phone_call",
] as const

export const EntitySchema = z
	.object({
		name: z.string().meta({
			description: "エンティティ名",
			examples: ["account", "opportunity"],
		}),
		type: z
			.enum(EntityTypeEnum)
			.nullable()
			.meta({
				description: "エンティティの種別",
				examples: ["account", null],
			}),
		display_name: z.string().meta({
			description: "エンティティの表示名",
			examples: ["取引先", "商談"],
		}),
		record_url_format: recordUrlFormat.nullable().meta({
			description: "レコードのURLを表す文字列フォーマット",
			example:
				'{ "app": "sampleapp://record_detail?entity=account&id={id}", "browser": "https://example.com/record_detail?entity=account&id={id}" }',
		}),
		has_location: z.boolean().meta({
			description: "エンティティが位置情報を保持しているかどうか",
			examples: [true, false],
		}),
		item_mapping: itemMapping.meta({
			description: "UPWARDが標準的に扱う項目名のマッピング",
		}),
	})
	.meta({
		description: "エンティティ",
	})

export const EntityListSchema = z.array(EntitySchema).meta({
	description: "エンティティ一覧",
})

export const GetEntityParamSchema = z.object({
	name: z.string(),
})

export type Entity = z.infer<typeof EntitySchema>
export type EntityList = z.infer<typeof EntityListSchema>
