import { z } from "zod"
import { EntityItemOptionListSchema } from "./entity-item-option"

// type
export const EntityItemTypeTextSchema = z.literal("text").meta({
	description: "text（テキスト型）",
})

export const EntityItemTypeNumericSchema = z.literal("numeric").meta({
	description: "numeric（数値型）",
})

export const EntityItemTypeBooleanSchema = z.literal("boolean").meta({
	description: "boolean（真偽値型）",
})

export const EntityItemTypeDateSchema = z.literal("date").meta({
	description: "date（日付型）",
})

export const EntityItemTypeOptionSchema = z.literal("option").meta({
	description: "option（オプション型）",
})

export const EntityItemTypeReferenceSchema = z.literal("reference").meta({
	description: "reference（参照型）",
})

// sub type
export const EntityItemSubTypeTextareaSchema = z.literal("textarea").meta({
	description: "textarea（テキストエリア）",
})

export const EntityItemSubTypePhoneSchema = z.literal("phone").meta({
	description: "phone（電話番号）",
})

export const EntityItemSubTypeEmailSchema = z.literal("email").meta({
	description: "email（メールアドレス）",
})

export const EntityItemSubTypeUrlSchema = z.literal("url").meta({
	description: "url（URL）",
})

export const EntityItemSubTypeComboboxSchema = z.literal("combobox").meta({
	description: "combobox（コンボボックス）",
})

export const EntityItemSubTypeIntegerSchema = z.literal("integer").meta({
	description: "integer（整数）",
})

export const EntityItemSubTypeDecimalSchema = z.literal("decimal").meta({
	description: "decimal（小数あり）",
})

export const EntityItemSubTypeDateSchema = z.literal("date").meta({
	description: "date（日付）",
})

export const EntityItemSubTypeDatetimeSchema = z.literal("datetime").meta({
	description: "datetime（日時）",
})

export const EntityItemSubTypeTimeSchema = z.literal("time").meta({
	description: "time（時刻）",
})

export const EntityItemSubTypeSingleTextSchema = z.literal("single").meta({
	description: "single（単一選択）",
})

export const EntityItemSubTypeMultiTextSchema = z.literal("multi").meta({
	description: "multi（複数選択）",
})

export const EntityItemTypeSchema = z
	.union([
		EntityItemTypeTextSchema,
		EntityItemTypeNumericSchema,
		EntityItemTypeBooleanSchema,
		EntityItemTypeDateSchema,
		EntityItemTypeOptionSchema,
		EntityItemTypeReferenceSchema,
	])
	.meta({
		description: "データ型",
		examples: ["text", "numeric", "boolean", "date", "option", "reference"],
	})

export const EntityItemSubTypeSchema = z
	.union([
		EntityItemSubTypeTextareaSchema,
		EntityItemSubTypePhoneSchema,
		EntityItemSubTypeEmailSchema,
		EntityItemSubTypeUrlSchema,
		EntityItemSubTypeComboboxSchema,
		EntityItemSubTypeIntegerSchema,
		EntityItemSubTypeDecimalSchema,
		EntityItemSubTypeDateSchema,
		EntityItemSubTypeDatetimeSchema,
		EntityItemSubTypeTimeSchema,
		EntityItemSubTypeSingleTextSchema,
		EntityItemSubTypeMultiTextSchema,
	])
	.meta({
		description: "サブデータ型",
		examples: [
			"textarea",
			"phone",
			"email",
			"url",
			"combobox",
			"integer",
			"decimal",
			"date",
			"datetime",
			"time",
			"single",
			"multi",
		],
	})

export const EntityItemSchema = z
	.object({
		name: z.string().meta({
			description: "項目名",
			examples: ["name", "phone_number"],
		}),
		display_name: z.string().meta({
			description: "項目の表示名",
			examples: ["取引先名", "電話番号"],
		}),
		type: EntityItemTypeSchema,
		sub_type: EntityItemSubTypeSchema.nullish(),
		is_required: z.boolean().meta({
			description: "必須入力かどうか",
			example: true,
		}),
		is_filterable: z.boolean().meta({
			description: "フィルタリング可能かどうか",
			example: true,
		}),
		is_creatable: z.boolean().meta({
			description: "レコード作成時に指定可能かどうか",
			example: true,
		}),
		is_updatable: z.boolean().meta({
			description: "レコード更新時に指定可能かどうか",
			example: true,
		}),
		is_formula: z.boolean().meta({
			description: "計算によって表現されるフィールドかどうか",
			example: false,
		}),
		max_length: z
			.number()
			.meta({
				description: "データ型が`text`の場合の最大文字数",
			})
			.nullish(),
		precision: z
			.number()
			.meta({
				description: "データ型が`numeric`の場合の精度（全体の桁数）",
			})
			.nullish(),
		scale: z
			.number()
			.meta({
				description: "データ型が`numeric`の場合の小数点以下の桁数",
			})
			.nullish(),
		reference_entities: z
			.array(z.string())
			.min(1)
			.meta({
				description: "データ型が`reference`の場合の参照先のエンティティ名一覧",
				example: [],
			})
			.nullish(),
		options: EntityItemOptionListSchema.meta({
			description:
				"データ型が`option`の場合、または、サブデータ型が`combobox`の場合の選択肢一覧",
			example: [],
		}).nullish(),
	})
	.meta({
		description: "エンティティ項目",
	})

export const EntityItemListSchema = z.array(EntityItemSchema).meta({
	description: "エンティティ項目一覧",
})

export const GetEntityItemParamSchema = z.object({
	entity_name: z.string(),
	name: z.string(),
})

export const GetEntityItemListParamSchema = z.object({
	entity_name: z.string(),
})

export type EntityItem = z.infer<typeof EntityItemSchema>
export type EntityItemList = z.infer<typeof EntityItemListSchema>
