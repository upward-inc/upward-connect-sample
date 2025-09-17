import type { Prisma } from "@prisma/client"

export async function seedEntityItems(prisma: Prisma.TransactionClient) {
	const entities = await prisma.entity.findMany()
	const getEntity = (entityName: string) => {
		const entity = entities.find(({ name }) => name === entityName)
		if (!entity) {
			throw new Error(`entity with name ${entityName} not found`)
		}
		return entity
	}

	const defaultValues = {
		sub_type: null,
		is_required: false,
		is_filterable: true,
		is_creatable: true,
		is_updatable: true,
		is_formula: false,
		max_length: null,
		precision: null,
		scale: null,
	}

	const commonPrefixMetadataItems = [
		{
			name: "id",
			display_name: "ID",
			type: "text",
			is_required: true,
			is_filterable: false,
			is_creatable: false,
			is_updatable: false,
		},
	]

	const commonSuffixMetadataItems = [
		{
			name: "is_deleted",
			display_name: "削除済み",
			type: "boolean",
			is_required: true,
			is_creatable: false,
			is_updatable: false,
		},
		{
			name: "owner",
			display_name: "所有者",
			type: "reference",
			is_required: true,
			is_creatable: false,
			is_updatable: false,
			reference_entities: JSON.stringify(["user"]),
		},
		{
			name: "created_at",
			display_name: "作成日時",
			type: "date",
			sub_type: "datetime",
			is_required: true,
			is_creatable: false,
			is_updatable: false,
		},
		{
			name: "created_by",
			display_name: "作成者",
			type: "reference",
			is_required: true,
			is_creatable: false,
			is_updatable: false,
			reference_entities: JSON.stringify(["user"]),
		},
		{
			name: "modified_at",
			display_name: "更新日時",
			type: "date",
			sub_type: "datetime",
			is_required: true,
			is_creatable: false,
			is_updatable: false,
		},
		{
			name: "modified_by",
			display_name: "更新者",
			type: "reference",
			is_required: true,
			is_creatable: false,
			is_updatable: false,
			reference_entities: JSON.stringify(["user"]),
		},
	]

	const commonAddressItems = [
		{
			name: "address_zipcode",
			display_name: "住所: 郵便番号",
			type: "text",
			max_length: 20,
		},
		{
			name: "address_prefecture",
			display_name: "住所: 都道府県",
			type: "text",
			max_length: 256,
		},
		{
			name: "address_municipality",
			display_name: "住所: 市区町村",
			type: "text",
			max_length: 256,
		},
		{
			name: "address_street",
			display_name: "住所: 番地等",
			type: "text",
			max_length: 256,
		},
	]

	const commonLocationItems = [
		{
			name: "latitude",
			display_name: "緯度",
			type: "numeric",
			sub_type: "decimal",
			precision: 18,
			scale: 15,
		},
		{
			name: "longitude",
			display_name: "経度",
			type: "numeric",
			sub_type: "decimal",
			precision: 18,
			scale: 15,
		},
	]

	const userItems = [
		...commonPrefixMetadataItems,
		{
			name: "user_name",
			display_name: "ユーザー名",
			type: "text",
			is_required: true,
			is_creatable: false,
			is_updatable: false,
			max_length: 256,
		},
		{
			name: "first_name",
			display_name: "名",
			type: "text",
			is_required: true,
			max_length: 256,
		},
		{
			name: "last_name",
			display_name: "姓",
			type: "text",
			is_required: true,
			max_length: 256,
		},
		{
			name: "full_name",
			display_name: "氏名",
			type: "text",
			is_formula: true,
			is_creatable: false,
			is_updatable: false,
			max_length: null,
		},
		{
			name: "email",
			display_name: "メールアドレス",
			type: "text",
			sub_type: "email",
			max_length: null,
		},
		{
			name: "timezone",
			display_name: "タイムゾーン",
			type: "text",
		},
		{
			name: "language",
			display_name: "言語",
			type: "text",
		},
		{
			name: "is_active",
			display_name: "有効",
			type: "boolean",
			is_required: true,
		},
		{
			name: "created_at",
			display_name: "作成日時",
			type: "date",
			sub_type: "datetime",
			is_required: true,
			is_creatable: false,
			is_updatable: false,
		},
		{
			name: "modified_at",
			display_name: "更新日時",
			type: "date",
			sub_type: "datetime",
			is_required: true,
			is_creatable: false,
			is_updatable: false,
		},
	].map((item, index) => {
		const entity = getEntity("user")
		return {
			...item,
			entity_id: entity.id,
			order: index + 1,
			created_by: entity.created_by,
			modified_by: entity.modified_by,
		}
	})

	const accountItems = [
		...commonPrefixMetadataItems,
		{
			name: "name",
			display_name: "取引先名",
			type: "text",
			is_required: true,
			max_length: 256,
		},
		{
			name: "account_number",
			display_name: "取引先番号",
			type: "text",
			max_length: 20,
		},
		{
			name: "main_phone_number",
			display_name: "電話番号（代表）",
			type: "text",
			sub_type: "phone",
			max_length: 50,
		},
		{
			name: "sub_phone_number",
			display_name: "電話番号（その他）",
			type: "text",
			sub_type: "phone",
			max_length: 50,
		},
		{
			name: "website",
			display_name: "Webサイト",
			type: "text",
			sub_type: "url",
			max_length: null,
		},
		{
			name: "industry",
			display_name: "業種",
			type: "option",
			sub_type: "single",
		},
		{
			name: "number_of_employees",
			display_name: "従業員数",
			type: "numeric",
			sub_type: "integer",
			precision: 6,
			scale: 0,
		},
		{
			name: "revenue",
			display_name: "売上高",
			type: "numeric",
			sub_type: "integer",
			precision: 16,
			scale: 0,
		},
		...commonAddressItems,
		...commonLocationItems,
		{
			name: "market_cap",
			display_name: "時価総額",
			type: "numeric",
			sub_type: "integer",
			precision: 16,
			scale: 0,
		},
		{
			name: "description",
			display_name: "説明",
			type: "text",
			sub_type: "textarea",
		},
		{
			name: "originating_lead",
			display_name: "元のリード",
			type: "reference",
			is_updatable: false,
			reference_entities: JSON.stringify(["lead"]),
		},
		{
			name: "parent",
			display_name: "親会社",
			type: "reference",
			reference_entities: JSON.stringify(["account"]),
		},
		{
			name: "last_activity_date",
			display_name: "最終活動日",
			type: "date",
			sub_type: "date",
			is_creatable: false,
			is_updatable: false,
			is_formula: true,
		},
		...commonSuffixMetadataItems,
	].map((item, index) => {
		const entity = getEntity("account")
		return {
			...item,
			entity_id: entity.id,
			order: index + 1,
			created_by: entity.created_by,
			modified_by: entity.modified_by,
		}
	})

	const leadItems = [
		...commonPrefixMetadataItems,
		{
			name: "company",
			display_name: "会社名",
			type: "text",
			is_required: true,
			max_length: 256,
		},
		{ name: "first_name", display_name: "名", type: "text", max_length: 256 },
		{
			name: "last_name",
			display_name: "姓",
			type: "text",
			is_required: true,
			max_length: 256,
		},
		{
			name: "full_name",
			display_name: "氏名",
			type: "text",
			is_formula: true,
			is_creatable: false,
			is_updatable: false,
			max_length: null,
		},
		{
			name: "business_unit",
			display_name: "部署",
			type: "text",
			max_length: 256,
		},
		{ name: "title", display_name: "役職", type: "text", max_length: 256 },
		...commonAddressItems,
		...commonLocationItems,
		{
			name: "phone_number",
			display_name: "電話番号",
			type: "text",
			sub_type: "phone",
			max_length: 50,
		},
		{
			name: "email",
			display_name: "メールアドレス",
			type: "text",
			sub_type: "email",
			max_length: null,
		},
		{
			name: "website",
			display_name: "Webサイト",
			type: "text",
			sub_type: "url",
			max_length: null,
		},
		{
			name: "description",
			display_name: "説明",
			type: "text",
			sub_type: "textarea",
		},
		{
			name: "lead_source",
			display_name: "リードソース",
			type: "option",
			sub_type: "single",
		},
		{
			name: "status",
			display_name: "状況",
			type: "option",
			sub_type: "single",
			is_required: true,
		},
		{
			name: "industry",
			display_name: "業種",
			type: "option",
			sub_type: "single",
		},
		{
			name: "rating",
			display_name: "評価",
			type: "option",
			sub_type: "single",
		},
		{
			name: "annual_revenue",
			display_name: "年間売上",
			type: "numeric",
			sub_type: "integer",
			precision: 16,
			scale: 0,
		},
		{
			name: "number_of_employees",
			display_name: "従業員数",
			type: "numeric",
			sub_type: "integer",
			precision: 6,
			scale: 0,
		},
		{
			name: "is_converted",
			display_name: "取引開始済み",
			type: "boolean",
			is_creatable: false,
		},
		{
			name: "converted_date",
			display_name: "取引開始日",
			type: "date",
			sub_type: "date",
			is_creatable: false,
		},
		{
			name: "last_activity_date",
			display_name: "最終活動日",
			type: "date",
			sub_type: "date",
			is_creatable: false,
			is_updatable: false,
			is_formula: true,
		},
		...commonSuffixMetadataItems,
	].map((item, index) => {
		const entity = getEntity("lead")
		return {
			...item,
			entity_id: entity.id,
			order: index + 1,
			created_by: entity.created_by,
			modified_by: entity.modified_by,
		}
	})

	const activityItems = [
		...commonPrefixMetadataItems,
		{
			name: "subject",
			display_name: "件名",
			type: "text",
			sub_type: "combobox",
			max_length: 256,
		},
		{
			name: "target",
			display_name: "活動先",
			type: "reference",
			reference_entities: JSON.stringify([
				"account",
				"lead",
				"contact",
				"opportunity",
				"case",
				"campaign",
			]),
		},
		{
			name: "start_date_time",
			display_name: "開始日時",
			type: "date",
			sub_type: "datetime",
		},
		{
			name: "end_date_time",
			display_name: "終了日時",
			type: "date",
			sub_type: "datetime",
		},
		{
			name: "duration_in_minutes",
			display_name: "所要時間",
			type: "numeric",
			sub_type: "integer",
			is_formula: true,
			is_creatable: false,
			is_updatable: false,
			precision: 6,
			scale: 0,
		},
		{
			name: "is_all_day_event",
			display_name: "終日行動",
			type: "boolean",
			is_required: true,
		},
		{
			name: "status",
			display_name: "ステータス",
			type: "option",
			sub_type: "single",
		},
		{ name: "location", display_name: "場所", type: "text", max_length: 256 },
		{
			name: "required_attendees",
			display_name: "必須出席者",
			type: "reference",
			reference_entities: JSON.stringify(["user", "contact"]),
		},
		{
			name: "optional_attendees",
			display_name: "任意出席者",
			type: "reference",
			reference_entities: JSON.stringify(["user", "contact"]),
		},
		{
			name: "organizer",
			display_name: "開催者",
			type: "reference",
			reference_entities: JSON.stringify(["user", "contact"]),
		},
		{
			name: "meeting_url",
			display_name: "ミーティングURL",
			type: "text",
			sub_type: "url",
			max_length: null,
		},
		{
			name: "description",
			display_name: "説明",
			type: "text",
			sub_type: "textarea",
		},
		{
			name: "is_archived",
			display_name: "アーカイブ済み",
			type: "boolean",
			is_required: true,
			is_creatable: false,
			is_updatable: false,
		},
		...commonSuffixMetadataItems,
	].map((item, index) => {
		const entity = getEntity("activity")
		return {
			...item,
			entity_id: entity.id,
			order: index + 1,
			created_by: entity.created_by,
			modified_by: entity.modified_by,
		}
	})

	const phoneCallItems = [
		...commonPrefixMetadataItems,
		{
			name: "subject",
			display_name: "件名",
			type: "text",
			is_required: true,
			max_length: 256,
		},
		{
			name: "user",
			display_name: "自社担当者",
			type: "reference",
			is_required: true,
			reference_entities: JSON.stringify(["user"]),
		},
		{
			name: "their",
			display_name: "相手方",
			type: "reference",
			is_required: true,
			reference_entities: JSON.stringify(["account", "lead", "contact"]),
		},
		{
			name: "phone_number",
			display_name: "電話番号",
			type: "text",
			sub_type: "phone",
			max_length: 50,
		},
		{
			name: "direction",
			display_name: "通話方向",
			type: "option",
			sub_type: "single",
			is_required: true,
		},
		{
			name: "start_date_time",
			display_name: "開始日時",
			type: "date",
			sub_type: "datetime",
		},
		{
			name: "end_date_time",
			display_name: "終了日時",
			type: "date",
			sub_type: "datetime",
		},
		{
			name: "duration_in_minutes",
			display_name: "所要時間",
			type: "numeric",
			sub_type: "integer",
			is_formula: true,
			is_creatable: false,
			is_updatable: false,
			precision: 6,
			scale: 0,
		},
		{
			name: "status",
			display_name: "ステータス",
			type: "option",
			sub_type: "single",
		},
		{
			name: "description",
			display_name: "説明",
			type: "text",
			sub_type: "textarea",
		},
		...commonSuffixMetadataItems,
	].map((item, index) => {
		const entity = getEntity("phone_call")
		return {
			...item,
			entity_id: entity.id,
			order: index + 1,
			created_by: entity.created_by,
			modified_by: entity.modified_by,
		}
	})

	const contactItems = [
		...commonPrefixMetadataItems,
		{ name: "first_name", display_name: "名", type: "text", max_length: 256 },
		{
			name: "last_name",
			display_name: "姓",
			type: "text",
			is_required: true,
			max_length: 256,
		},
		{
			name: "full_name",
			display_name: "氏名",
			type: "text",
			is_formula: true,
			is_creatable: false,
			is_updatable: false,
			max_length: null,
		},
		{
			name: "gender",
			display_name: "性別",
			type: "option",
			sub_type: "single",
		},
		{
			name: "account",
			display_name: "取引先",
			type: "reference",
			reference_entities: JSON.stringify(["account"]),
		},
		{
			name: "business_unit",
			display_name: "部署",
			type: "text",
			max_length: 256,
		},
		{ name: "title", display_name: "役職", type: "text", max_length: 256 },
		{
			name: "company_phone_number",
			display_name: "電話番号（会社）",
			type: "text",
			sub_type: "phone",
			max_length: 50,
		},
		{
			name: "mobile_phone_number",
			display_name: "電話番号（携帯）",
			type: "text",
			sub_type: "phone",
			max_length: 50,
		},
		{
			name: "email",
			display_name: "メールアドレス",
			type: "text",
			sub_type: "email",
			max_length: null,
		},
		{
			name: "website",
			display_name: "Webサイト",
			type: "text",
			sub_type: "url",
			max_length: null,
		},
		{
			name: "originating_lead",
			display_name: "元のリード",
			type: "reference",
			is_updatable: false,
			reference_entities: JSON.stringify(["lead"]),
		},
		{
			name: "description",
			display_name: "説明",
			type: "text",
			sub_type: "textarea",
		},
		...commonSuffixMetadataItems,
	].map((item, index) => {
		const entity = getEntity("contact")
		return {
			...item,
			entity_id: entity.id,
			order: index + 1,
			created_by: entity.created_by,
			modified_by: entity.modified_by,
		}
	})

	const opportunityItems = [
		...commonPrefixMetadataItems,
		{
			name: "name",
			display_name: "商談名",
			type: "text",
			is_required: true,
			max_length: 256,
		},
		{
			name: "account",
			display_name: "取引先",
			is_required: true,
			type: "reference",
			reference_entities: JSON.stringify(["account"]),
		},
		{
			name: "phase",
			display_name: "フェーズ",
			type: "option",
			sub_type: "single",
			is_required: true,
		},
		{
			name: "amount",
			display_name: "金額",
			type: "numeric",
			sub_type: "integer",
			precision: 16,
			scale: 0,
		},
		{
			name: "probability",
			display_name: "確度 (%)",
			type: "numeric",
			sub_type: "decimal",
			precision: 5,
			scale: 2,
		},
		{
			name: "close_date",
			display_name: "完了予定日",
			type: "date",
			sub_type: "date",
			is_required: true,
		},
		{
			name: "type",
			display_name: "種別",
			type: "option",
			sub_type: "single",
		},
		{
			name: "next_step",
			display_name: "次のステップ",
			type: "text",
			max_length: 256,
		},
		{
			name: "lead_source",
			display_name: "リードソース",
			type: "option",
			sub_type: "single",
		},
		{
			name: "campaign",
			display_name: "キャンペーン",
			type: "reference",
			reference_entities: JSON.stringify(["campaign"]),
		},
		{
			name: "contact",
			display_name: "取引先責任者",
			type: "reference",
			reference_entities: JSON.stringify(["contact"]),
		},
		{
			name: "is_closed",
			display_name: "完了",
			type: "boolean",
			is_required: true,
		},
		{
			name: "description",
			display_name: "説明",
			type: "text",
			sub_type: "textarea",
		},
		...commonSuffixMetadataItems,
	].map((item, index) => {
		const entity = getEntity("opportunity")
		return {
			...item,
			entity_id: entity.id,
			order: index + 1,
			created_by: entity.created_by,
			modified_by: entity.modified_by,
		}
	})

	const caseItems = [
		...commonPrefixMetadataItems,
		{
			name: "case_number",
			display_name: "ケース番号（MEMO: 自動採番を想定）",
			type: "text",
			is_required: true,
			is_creatable: false,
			is_updatable: false,
			max_length: 30,
		},
		{
			name: "subject",
			display_name: "件名",
			type: "text",
			is_required: true,
			max_length: 256,
		},
		{
			name: "detail",
			display_name: "詳細",
			type: "text",
			max_length: null,
		},
		{
			name: "contact",
			display_name: "取引先責任者",
			type: "reference",
			reference_entities: JSON.stringify(["contact"]),
		},
		{
			name: "account",
			display_name: "取引先",
			type: "reference",
			reference_entities: JSON.stringify(["account"]),
		},
		{
			name: "parent",
			display_name: "親ケース",
			type: "reference",
			reference_entities: JSON.stringify(["case"]),
		},
		{
			name: "type",
			display_name: "種別",
			type: "option",
			sub_type: "single",
		},
		{
			name: "status",
			display_name: "状況",
			type: "option",
			sub_type: "single",
		},
		{
			name: "reason",
			display_name: "原因",
			type: "option",
			sub_type: "single",
		},
		{
			name: "origin",
			display_name: "発生源",
			type: "option",
			sub_type: "single",
		},
		{
			name: "priority",
			display_name: "優先度",
			type: "option",
			sub_type: "single",
		},
		{
			name: "is_escalated",
			display_name: "エスカレーション済",
			type: "boolean",
			is_required: true,
		},
		{
			name: "closed_datetime",
			display_name: "完了日時",
			type: "date",
			sub_type: "datetime",
			is_creatable: false,
		},
		{
			name: "description",
			display_name: "説明",
			type: "text",
			sub_type: "textarea",
		},
		...commonSuffixMetadataItems,
	].map((item, index) => {
		const entity = getEntity("case")
		return {
			...item,
			entity_id: entity.id,
			order: index + 1,
			created_by: entity.created_by,
			modified_by: entity.modified_by,
		}
	})

	const productItems = [
		...commonPrefixMetadataItems,
		{
			name: "name",
			display_name: "製品名",
			type: "text",
			is_required: true,
			max_length: 256,
		},
		{
			name: "product",
			display_name: "製品コード",
			type: "text",
			max_length: 256,
		},
		{
			name: "description",
			display_name: "説明",
			type: "text",
			sub_type: "textarea",
		},
		{
			name: "is_active",
			display_name: "有効",
			type: "boolean",
			is_required: true,
		},
		{
			name: "family",
			display_name: "製品ファミリー",
			type: "option",
			sub_type: "single",
		},
		{
			name: "external_id",
			display_name: "外部ID",
			type: "text",
			max_length: 256,
		},
		{
			name: "url",
			display_name: "URL",
			type: "text",
			sub_type: "url",
			max_length: null,
		},
		{
			name: "quantity_unit",
			display_name: "数量単位",
			type: "option",
			sub_type: "single",
		},
		{
			name: "is_archived",
			display_name: "アーカイブ済み",
			type: "boolean",
			is_required: true,
			is_creatable: false,
		},
		...commonSuffixMetadataItems,
	].map((item, index) => {
		const entity = getEntity("product")
		return {
			...item,
			entity_id: entity.id,
			order: index + 1,
			created_by: entity.created_by,
			modified_by: entity.modified_by,
		}
	})

	const campaignItems = [
		...commonPrefixMetadataItems,
		{
			name: "name",
			display_name: "キャンペーン名",
			type: "text",
			is_required: true,
			max_length: 256,
		},
		{
			name: "code",
			display_name: "コード",
			type: "text",
			max_length: 32,
		},
		{
			name: "type",
			display_name: "種別",
			type: "option",
			sub_type: "single",
		},
		{
			name: "start_date",
			display_name: "開始日",
			type: "date",
			sub_type: "date",
		},
		{
			name: "end_date",
			display_name: "終了日",
			type: "date",
			sub_type: "date",
		},
		{
			name: "description",
			display_name: "説明",
			type: "text",
			sub_type: "textarea",
		},
		{
			name: "expected_response",
			display_name: "予想回答率",
			type: "numeric",
			sub_type: "decimal",
			precision: 5,
			scale: 2,
		},
		{
			name: "budgeted_cost",
			display_name: "割り当て予算",
			type: "numeric",
			sub_type: "integer",
			precision: 16,
			scale: 0,
		},
		{
			name: "expected_revenue",
			display_name: "売上見込み",
			type: "numeric",
			sub_type: "integer",
			precision: 16,
			scale: 0,
		},
		{
			name: "status",
			display_name: "ステータス",
			type: "option",
			sub_type: "single",
		},
		...commonSuffixMetadataItems,
	].map((item, index) => {
		const entity = getEntity("campaign")
		return {
			...item,
			entity_id: entity.id,
			order: index + 1,
			created_by: entity.created_by,
			modified_by: entity.modified_by,
		}
	})

	const sampleItems = [
		...commonPrefixMetadataItems,
		{
			name: "name",
			display_name: "名称",
			type: "text",
			is_required: true,
			max_length: 256,
		},
		{
			name: "text",
			display_name: "テキスト",
			type: "text",
		},
		{
			name: "textarea",
			display_name: "テキストエリア",
			type: "text",
			sub_type: "textarea",
		},
		{
			name: "phone_number",
			display_name: "電話番号",
			type: "text",
			sub_type: "phone",
			max_length: 50,
		},
		{
			name: "email",
			display_name: "メールアドレス",
			type: "text",
			sub_type: "email",
		},
		{
			name: "url",
			display_name: "URL",
			type: "text",
			sub_type: "url",
		},
		{
			name: "combobox",
			display_name: "コンボボックス",
			type: "text",
			sub_type: "combobox",
		},
		{
			name: "integer",
			display_name: "整数",
			type: "numeric",
			sub_type: "integer",
			precision: 16,
			scale: 0,
		},
		{
			name: "decimal",
			display_name: "少数あり",
			type: "numeric",
			sub_type: "decimal",
			precision: 16,
			scale: 2,
		},
		{
			name: "boolean",
			display_name: "真偽値",
			type: "boolean",
		},
		{
			name: "date",
			display_name: "日付",
			type: "date",
			sub_type: "date",
		},
		{
			name: "datetime",
			display_name: "日時",
			type: "date",
			sub_type: "datetime",
		},
		{
			name: "time",
			display_name: "時刻",
			type: "date",
			sub_type: "time",
		},
		{
			name: "option_single",
			display_name: "単一選択肢",
			type: "option",
			sub_type: "single",
		},
		{
			name: "option_multi",
			display_name: "複数選択肢",
			type: "option",
			sub_type: "multi",
		},
		{
			name: "reference_single_target_single_id",
			display_name: "単一参照先、単一ID",
			type: "reference",
			sub_type: "single",
			reference_entities: JSON.stringify(["account"]),
		},
		{
			name: "reference_single_target_multi_id",
			display_name: "単一参照先、複数ID",
			type: "reference",
			sub_type: "multi",
			reference_entities: JSON.stringify(["account"]),
		},
		{
			name: "reference_multi_target_single_id",
			display_name: "複数参照先、単一ID",
			type: "reference",
			sub_type: "single",
			reference_entities: JSON.stringify(["account", "lead"]),
		},
		{
			name: "reference_multi_target_multi_id",
			display_name: "複数参照先、複数ID",
			type: "reference",
			sub_type: "multi",
			reference_entities: JSON.stringify(["account", "lead"]),
		},
		{
			name: "formula_text",
			display_name: "数式: テキスト",
			type: "text",
			is_formula: true,
			is_creatable: false,
			is_updatable: false,
		},
		{
			name: "formula_integer",
			display_name: "数式: 整数",
			type: "numeric",
			sub_type: "integer",
			is_formula: true,
			is_creatable: false,
			is_updatable: false,
			precision: 16,
			scale: 0,
		},
		{
			name: "formula_boolean",
			display_name: "数式: 真偽値",
			type: "boolean",
			is_formula: true,
			is_creatable: false,
			is_updatable: false,
		},
		{
			name: "formula_date",
			display_name: "数式: 日付",
			type: "date",
			sub_type: "date",
			is_formula: true,
			is_creatable: false,
			is_updatable: false,
		},
		{
			name: "formula_reference_single_target_single_id",
			display_name: "数式: 単一参照先、単一ID",
			type: "reference",
			sub_type: "single",
			is_formula: true,
			is_creatable: false,
			is_updatable: false,
			reference_entities: JSON.stringify(["account"]),
		},
		...commonSuffixMetadataItems,
	].map((item, index) => {
		const entity = getEntity("sample")
		return {
			...item,
			entity_id: entity.id,
			order: index + 1,
			created_by: entity.created_by,
			modified_by: entity.modified_by,
		}
	})

	const items = [
		...userItems,
		...accountItems,
		...leadItems,
		...activityItems,
		...phoneCallItems,
		...contactItems,
		...opportunityItems,
		...caseItems,
		...productItems,
		...campaignItems,
		...sampleItems,
	].map((item) => ({ ...defaultValues, ...item }))

	const records = await prisma.entity_item.createMany({ data: items })

	console.info(`>> entity_item records created: ${records.count}`)

	return records
}
