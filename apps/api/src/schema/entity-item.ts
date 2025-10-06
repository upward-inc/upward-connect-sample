import { z } from "zod"
import "zod-openapi/extend"
import { EntityItemOptionListSchema } from "./entity-item-option"

// type
export const EntityItemTypeTextSchema = z.literal("text").openapi({
	description: "text（テキスト型）",
})

export const EntityItemTypeNumericSchema = z.literal("numeric").openapi({
	description: "numeric（数値型）",
})

export const EntityItemTypeBooleanSchema = z.literal("boolean").openapi({
	description: "boolean（真偽値型）",
})

export const EntityItemTypeDateSchema = z.literal("date").openapi({
	description: "date（日付型）",
})

export const EntityItemTypeOptionSchema = z.literal("option").openapi({
	description: "option（オプション型）",
})

export const EntityItemTypeReferenceSchema = z.literal("reference").openapi({
	description: "reference（参照型）",
})

// sub type
export const EntityItemSubTypeTextareaSchema = z.literal("textarea").openapi({
	description: "textarea（テキストエリア）",
})

export const EntityItemSubTypePhoneSchema = z.literal("phone").openapi({
	description: "phone（電話番号）",
})

export const EntityItemSubTypeEmailSchema = z.literal("email").openapi({
	description: "email（メールアドレス）",
})

export const EntityItemSubTypeUrlSchema = z.literal("url").openapi({
	description: "url（URL）",
})

export const EntityItemSubTypeComboboxSchema = z.literal("combobox").openapi({
	description: "combobox（コンボボックス）",
})

export const EntityItemSubTypeIntegerSchema = z.literal("integer").openapi({
	description: "integer（整数）",
})

export const EntityItemSubTypeDecimalSchema = z.literal("decimal").openapi({
	description: "decimal（小数あり）",
})

export const EntityItemSubTypeDateSchema = z.literal("date").openapi({
	description: "date（日付）",
})

export const EntityItemSubTypeDatetimeSchema = z.literal("datetime").openapi({
	description: "datetime（日時）",
})

export const EntityItemSubTypeTimeSchema = z.literal("time").openapi({
	description: "time（時刻）",
})

export const EntityItemSubTypeSingleTextSchema = z.literal("single").openapi({
	description: "single（単一選択）",
})

export const EntityItemSubTypeMultiTextSchema = z.literal("multi").openapi({
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
	.openapi({
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
	.openapi({
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
		name: z.string().openapi({
			description: "項目名",
			examples: ["name", "phone_number"],
		}),
		display_name: z.string().openapi({
			description: "項目の表示名",
			examples: ["取引先名", "電話番号"],
		}),
		type: EntityItemTypeSchema,
		sub_type: EntityItemSubTypeSchema.nullish(),
		is_required: z.boolean().openapi({
			description: "必須入力かどうか",
			example: true,
		}),
		is_filterable: z.boolean().openapi({
			description: "フィルタリング可能かどうか",
			example: true,
		}),
		is_creatable: z.boolean().openapi({
			description: "レコード作成時に指定可能かどうか",
			example: true,
		}),
		is_updatable: z.boolean().openapi({
			description: "レコード更新時に指定可能かどうか",
			example: true,
		}),
		is_formula: z.boolean().openapi({
			description: "計算によって表現されるフィールドかどうか",
			example: false,
		}),
		max_length: z
			.number()
			.openapi({
				description: "データ型が`text`の場合の最大文字数",
			})
			.nullish(),
		precision: z
			.number()
			.openapi({
				description: "データ型が`numeric`の場合の精度（全体の桁数）",
			})
			.nullish(),
		scale: z
			.number()
			.openapi({
				description: "データ型が`numeric`の場合の小数点以下の桁数",
			})
			.nullish(),
		reference_entities: z
			.array(z.string())
			.min(1)
			.openapi({
				description: "データ型が`reference`の場合の参照先のエンティティ名一覧",
				example: [],
			})
			.nullish(),
		options: EntityItemOptionListSchema.openapi({
			description:
				"データ型が`option`の場合、または、サブデータ型が`combobox`の場合の選択肢一覧",
			example: [],
		}).nullish(),
	})
	.openapi({
		description: "エンティティ項目",
	})

export const EntityItemListSchema = z.array(EntityItemSchema).openapi({
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
