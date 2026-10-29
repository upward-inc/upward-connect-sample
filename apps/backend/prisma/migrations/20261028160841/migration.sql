BEGIN TRY

BEGIN TRAN;

-- 参照項目の多態参照（複数参照先）と複数レコードの参照（sub_type: multi）が仕様でサポートされなくなったため、sample からそれらを前提にした項目と列をなくす
-- seed を入れ直さない既存の DB でもエンティティ項目の取得が失敗しないよう、entity_item も seed（seed/entity-item.ts）と同じ状態に更新する

-- 1. 削除する列に対応するエンティティ項目を削除する（選択肢は持たないが、外部キーがあるため先に削除する）
DELETE [eio]
FROM [entity_item_option] AS [eio]
INNER JOIN [entity_item] AS [ei] ON [ei].[id] = [eio].[entity_item_id]
INNER JOIN [entity] AS [e] ON [e].[id] = [ei].[entity_id]
WHERE [e].[name] = N'sample' AND [ei].[name] IN (N'reference_single_target_multi_id', N'reference_multi_target_single_id', N'reference_multi_target_multi_id');

DELETE [ei]
FROM [entity_item] AS [ei]
INNER JOIN [entity] AS [e] ON [e].[id] = [ei].[entity_id]
WHERE [e].[name] = N'sample' AND [ei].[name] IN (N'reference_single_target_multi_id', N'reference_multi_target_single_id', N'reference_multi_target_multi_id');

-- 2. 列を削除する
ALTER TABLE [sample] DROP COLUMN [reference_single_target_multi_id], [reference_multi_target_single_id], [reference_multi_target_multi_id];

-- 3. sample_view は `SELECT *` で定義されており、列の削除に追従させるためにメタデータを更新する
-- view はマイグレーションの外で作成されるため、まだ存在しない DB（テスト用 DB など）では何もしない
IF OBJECT_ID(N'sample_view', N'V') IS NOT NULL
BEGIN
  EXEC sp_refreshview N'sample_view';
END;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
  ROLLBACK TRAN;
END;
THROW

END CATCH
