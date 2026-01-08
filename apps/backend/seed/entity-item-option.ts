import type { Prisma } from "@prisma/client"

export async function seedEntityItemOptions(prisma: Prisma.TransactionClient) {
	const entities = await prisma.entity.findMany()
	const entityItems = await prisma.entity_item.findMany()

	const getEntity = (entityName: string) => {
		const entity = entities.find(({ name }) => name === entityName)
		if (!entity) {
			throw new Error(`entity with name ${entityName} not found`)
		}
		return entity
	}

	const getEntityItem = (entityName: string, entityItemName: string) => {
		const entity = getEntity(entityName)
		const entityItem = entityItems.find(
			(item) => item.entity_id === entity.id && item.name === entityItemName,
		)
		if (!entityItem) {
			throw new Error(`entity item with name ${entityItemName} not found`)
		}
		return entityItem
	}

	const defaultValues = {
		is_default: false,
	}

	const accountOptions = [
		{
			entity_item_id: getEntityItem("account", "industry").id,
			options: [
				{ name: "agriculture", display_name: "農業" },
				{ name: "fishing", display_name: "漁業" },
				{ name: "manufacturing", display_name: "製造業" },
				{ name: "construction", display_name: "建設業" },
				{ name: "retail", display_name: "小売業" },
				{ name: "wholesale", display_name: "卸売業" },
				{ name: "finance", display_name: "金融業" },
				{ name: "real_estate", display_name: "不動産業" },
				{ name: "transportation", display_name: "運輸業" },
				{ name: "it", display_name: "情報通信業" },
				{ name: "education", display_name: "教育業" },
				{ name: "healthcare", display_name: "医療・福祉" },
				{ name: "hospitality", display_name: "宿泊業" },
				{ name: "food_service", display_name: "飲食業" },
				{ name: "entertainment", display_name: "娯楽業" },
				{ name: "legal", display_name: "法律業" },
				{ name: "consulting", display_name: "コンサルティング業" },
				{ name: "public_admin", display_name: "公務" },
				{ name: "energy", display_name: "エネルギー業" },
				{ name: "environment", display_name: "環境関連業" },
				{ name: "other", display_name: "その他" },
			],
		},
	].flatMap(({ entity_item_id, options }) => {
		const entity = getEntity("account")
		return options.map((option, index) => ({
			entity_item_id,
			...option,
			order: index + 1,
			created_by: entity.created_by,
			modified_by: entity.modified_by,
		}))
	})

	const leadOptions = [
		{
			entity_item_id: getEntityItem("lead", "lead_source").id,
			options: [
				{ name: "advertisement", display_name: "広告" },
				{ name: "employee_referral", display_name: "紹介 (従業員)" },
				{ name: "external_referral", display_name: "紹介 (外部)" },
				{ name: "partner", display_name: "パートナー" },
				{ name: "public_relations", display_name: "広報活動" },
				{ name: "seminar_internal", display_name: "セミナー" },
				{ name: "seminar_partner", display_name: "外部セミナー" },
				{ name: "trade_show", display_name: "展示会" },
				{ name: "web", display_name: "Web" },
				{ name: "word_of_mouth", display_name: "口コミ" },
				{ name: "other", display_name: "その他" },
			],
		},
		{
			entity_item_id: getEntityItem("lead", "status").id,
			options: [
				{ name: "new", display_name: "新規", is_default: true },
				{ name: "contacted", display_name: "評価中" },
				{ name: "nurturing", display_name: "ナーチャリング" },
				{ name: "qualified", display_name: "評価済み" },
				{ name: "unqualified", display_name: "不要" },
			],
		},
		{
			entity_item_id: getEntityItem("lead", "industry").id,
			options: [
				{ name: "agriculture", display_name: "農業" },
				{ name: "fishing", display_name: "漁業" },
				{ name: "manufacturing", display_name: "製造業" },
				{ name: "construction", display_name: "建設業" },
				{ name: "retail", display_name: "小売業" },
				{ name: "wholesale", display_name: "卸売業" },
				{ name: "finance", display_name: "金融業" },
				{ name: "real_estate", display_name: "不動産業" },
				{ name: "transportation", display_name: "運輸業" },
				{ name: "it", display_name: "情報通信業" },
				{ name: "education", display_name: "教育業" },
				{ name: "healthcare", display_name: "医療・福祉" },
				{ name: "hospitality", display_name: "宿泊業" },
				{ name: "food_service", display_name: "飲食業" },
				{ name: "entertainment", display_name: "娯楽業" },
				{ name: "legal", display_name: "法律業" },
				{ name: "consulting", display_name: "コンサルティング業" },
				{ name: "public_admin", display_name: "公務" },
				{ name: "energy", display_name: "エネルギー業" },
				{ name: "environment", display_name: "環境関連業" },
				{ name: "other", display_name: "その他" },
			],
		},
		{
			entity_item_id: getEntityItem("lead", "rating").id,
			options: [
				{ name: "hot", display_name: "見込み有り" },
				{ name: "warm", display_name: "将来見込み有り" },
				{ name: "cold", display_name: "見込み無し" },
			],
		},
	].flatMap(({ entity_item_id, options }) => {
		const entity = getEntity("lead")
		return options.map((option, index) => ({
			entity_item_id,
			...option,
			order: index + 1,
			created_by: entity.created_by,
			modified_by: entity.modified_by,
		}))
	})

	const activityOptions = [
		{
			entity_item_id: getEntityItem("activity", "subject").id,
			options: [
				{ name: "call", display_name: "電話" },
				{ name: "email", display_name: "メール" },
				{ name: "appointment", display_name: "アポイントメント" },
				{ name: "meeting", display_name: "ミーティング" },
				{ name: "send_quote", display_name: "見積の送信" },
				{ name: "send_other", display_name: "その他" },
			],
		},
		{
			entity_item_id: getEntityItem("activity", "status").id,
			options: [
				{ name: "available", display_name: "空き時間" },
				{ name: "tentative", display_name: "仮の予定" },
				{ name: "completed", display_name: "完了" },
				{ name: "canceled", display_name: "キャンセル済み" },
				{ name: "scheduled", display_name: "予定あり" },
				{ name: "out_of_office", display_name: "外出中" },
			],
		},
	].flatMap(({ entity_item_id, options }) => {
		const entity = getEntity("activity")
		return options.map((option, index) => ({
			entity_item_id,
			...option,
			order: index + 1,
			created_by: entity.created_by,
			modified_by: entity.modified_by,
		}))
	})

	const phoneCallOptions = [
		{
			entity_item_id: getEntityItem("phone_call", "direction").id,
			options: [
				{ name: "inbound", display_name: "着信" },
				{ name: "outbound", display_name: "発信" },
			],
		},
		{
			entity_item_id: getEntityItem("phone_call", "status").id,
			options: [
				{ name: "connected", display_name: "通話" },
				{ name: "missed", display_name: "不在" },
			],
		},
	].flatMap(({ entity_item_id, options }) => {
		const entity = getEntity("phone_call")
		return options.map((option, index) => ({
			entity_item_id,
			...option,
			order: index + 1,
			created_by: entity.created_by,
			modified_by: entity.modified_by,
		}))
	})

	const contactOptions = [
		{
			entity_item_id: getEntityItem("contact", "gender").id,
			options: [
				{ name: "male", display_name: "男" },
				{ name: "female", display_name: "女" },
			],
		},
	].flatMap(({ entity_item_id, options }) => {
		const entity = getEntity("contact")
		return options.map((option, index) => ({
			entity_item_id,
			...option,
			order: index + 1,
			created_by: entity.created_by,
			modified_by: entity.modified_by,
		}))
	})

	const opportunityOptions = [
		{
			entity_item_id: getEntityItem("opportunity", "phase").id,
			options: [
				{ name: "contact", display_name: "コンタクト" },
				{ name: "evaluation", display_name: "評価" },
				{ name: "need_assessment", display_name: "ニーズの把握" },
				{ name: "proposal", display_name: "提案" },
				{ name: "budget_confirmation", display_name: "予算/決定者の確認" },
				{ name: "price_negotiation", display_name: "価格交渉" },
				{ name: "proposal_creation", display_name: "提案書/見積書の作成" },
				{ name: "final_negotiation", display_name: "最終交渉" },
				{ name: "deal_won", display_name: "商談成立" },
				{ name: "deal_lost", display_name: "ロスト" },
			],
		},
		{
			entity_item_id: getEntityItem("opportunity", "type").id,
			options: [
				{ name: "new_business", display_name: "新規ビジネス" },
				{ name: "existing_business", display_name: "既存ビジネス" },
			],
		},
		{
			entity_item_id: getEntityItem("opportunity", "lead_source").id,
			options: [
				{ name: "advertisement", display_name: "広告" },
				{ name: "employee_referral", display_name: "紹介 (従業員)" },
				{ name: "external_referral", display_name: "紹介 (外部)" },
				{ name: "partner", display_name: "パートナー" },
				{ name: "public_relations", display_name: "広報活動" },
				{ name: "seminar_internal", display_name: "セミナー" },
				{ name: "seminar_partner", display_name: "外部セミナー" },
				{ name: "trade_show", display_name: "展示会" },
				{ name: "web", display_name: "Web" },
				{ name: "word_of_mouth", display_name: "口コミ" },
				{ name: "other", display_name: "その他" },
			],
		},
	].flatMap(({ entity_item_id, options }) => {
		const entity = getEntity("opportunity")
		return options.map((option, index) => ({
			entity_item_id,
			...option,
			order: index + 1,
			created_by: entity.created_by,
			modified_by: entity.modified_by,
		}))
	})

	const caseOptions = [
		{
			entity_item_id: getEntityItem("case", "type").id,
			options: [
				{
					name: "problem",
					display_name: "問題",
				},
				{
					name: "feature_request",
					display_name: "機能要求",
				},
				{
					name: "question",
					display_name: "質問",
				},
			],
		},
		{
			entity_item_id: getEntityItem("case", "status").id,
			options: [
				{
					name: "on_hold",
					display_name: "保留",
				},
				{
					name: "escalated",
					display_name: "エスカレーション済",
				},
				{
					name: "closed",
					display_name: "クローズ",
				},
				{
					name: "new",
					display_name: "新規",
					is_default: true,
				},
			],
		},
		{
			entity_item_id: getEntityItem("case", "reason").id,
			options: [
				{
					name: "user_didnot_attend_training",
					display_name: "トレーニング未受講",
				},
				{
					name: "complex_functionality",
					display_name: "複雑な機能",
				},
				{
					name: "existing_problem",
					display_name: "既存の問題",
				},
				{
					name: "instructions_not_clear",
					display_name: "説明の不適切",
				},
				{
					name: "new_problem",
					display_name: "新規の問題",
				},
			],
		},
		{
			entity_item_id: getEntityItem("case", "origin").id,
			options: [
				{
					name: "email",
					display_name: "電子メール",
				},
				{
					name: "phone",
					display_name: "電話",
				},
				{
					name: "web",
					display_name: "Web",
				},
			],
		},
		{
			entity_item_id: getEntityItem("case", "priority").id,
			options: [
				{
					name: "high",
					display_name: "高",
				},
				{
					name: "medium",
					display_name: "中",
					is_default: true,
				},
				{
					name: "low",
					display_name: "低",
				},
			],
		},
	].flatMap(({ entity_item_id, options }) => {
		const entity = getEntity("case")
		return options.map((option, index) => ({
			entity_item_id,
			...option,
			order: index + 1,
			created_by: entity.created_by,
			modified_by: entity.modified_by,
		}))
	})

	const productOptions = [
		{
			entity_item_id: getEntityItem("product", "family").id,
			options: [{ name: "none", display_name: "None" }],
		},
		{
			entity_item_id: getEntityItem("product", "quantity_unit").id,
			options: [{ name: "each", display_name: "Each" }],
		},
	].flatMap(({ entity_item_id, options }) => {
		const entity = getEntity("product")
		return options.map((option, index) => ({
			entity_item_id,
			...option,
			order: index + 1,
			created_by: entity.created_by,
			modified_by: entity.modified_by,
		}))
	})

	const campaignOptions = [
		{
			entity_item_id: getEntityItem("campaign", "status").id,
			options: [
				{ name: "proposal", display_name: "提案済み" },
				{ name: "preparation", display_name: "実施準備済み" },
				{ name: "in_progress", display_name: "実施中" },
				{ name: "completed", display_name: "完了" },
				{ name: "canceled", display_name: "キャンセル済み" },
				{ name: "stopped", display_name: "中止" },
				{ name: "inactive", display_name: "非アクティブ" },
			],
		},
		{
			entity_item_id: getEntityItem("campaign", "type").id,
			options: [
				{ name: "advertisement", display_name: "広告", is_default: true },
				{ name: "direct_marketing", display_name: "ダイレクト マーケティング" },
				{ name: "event", display_name: "イベント" },
				{ name: "brand_partnership", display_name: "ブランド提携" },
				{ name: "other", display_name: "その他" },
			],
		},
	].flatMap(({ entity_item_id, options }) => {
		const entity = getEntity("campaign")
		return options.map((option, index) => ({
			entity_item_id,
			...option,
			order: index + 1,
			created_by: entity.created_by,
			modified_by: entity.modified_by,
		}))
	})

	const sampleOptions = [
		{
			entity_item_id: getEntityItem("sample", "combobox").id,
			options: [
				{ name: "option1", display_name: "オプション1" },
				{ name: "option2", display_name: "オプション2" },
				{ name: "option3", display_name: "オプション3" },
				{ name: "option4", display_name: "オプション4" },
				{ name: "option5", display_name: "オプション5" },
			],
		},
		{
			entity_item_id: getEntityItem("sample", "option_single").id,
			options: [
				{ name: "option1", display_name: "オプション1", is_default: true },
				{ name: "option2", display_name: "オプション2" },
				{ name: "option3", display_name: "オプション3" },
				{ name: "option4", display_name: "オプション4" },
				{ name: "option5", display_name: "オプション5" },
			],
		},
		{
			entity_item_id: getEntityItem("sample", "option_multi").id,
			options: [
				{ name: "option1", display_name: "オプション1" },
				{ name: "option2", display_name: "オプション2", is_default: true },
				{ name: "option3", display_name: "オプション3" },
				{ name: "option4", display_name: "オプション4", is_default: true },
				{ name: "option5", display_name: "オプション5" },
			],
		},
	].flatMap(({ entity_item_id, options }) => {
		const entity = getEntity("campaign")
		return options.map((option, index) => ({
			entity_item_id,
			...option,
			order: index + 1,
			created_by: entity.created_by,
			modified_by: entity.modified_by,
		}))
	})

	const options = [
		...accountOptions,
		...leadOptions,
		...activityOptions,
		...phoneCallOptions,
		...contactOptions,
		...opportunityOptions,
		...caseOptions,
		...productOptions,
		...campaignOptions,
		...sampleOptions,
	].map((item) => ({ ...defaultValues, ...item }))

	const records = await prisma.entity_item_option.createMany({ data: options })

	console.info(`>> entity_item_option records created: ${records.count}`)

	return records
}
