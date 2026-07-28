/**
 * レコードとファイルの紐付けを表す`source_record`のJSON文字列を生成する。
 *
 * 検索は保存された文字列との完全一致で行うため、保存・検索の実装では必ずこの関数を経由して直列化し形式を一致させる。
 */
export const toSourceRecordJson = (
	entityName: string,
	recordId: string,
): string => JSON.stringify({ entity_name: entityName, id: recordId })
