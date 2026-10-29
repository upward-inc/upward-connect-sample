BEGIN TRY

BEGIN TRAN;

-- 参照項目の多態参照（複数参照先）が仕様でサポートされなくなったため、多態参照だった参照項目の参照先を 1 つのエンティティに絞る
-- seed を入れ直さない既存の DB でもエンティティ項目の取得が失敗しないよう、entity_item も seed（seed/entity-item.ts）と同じ状態に更新する
-- 既存のレコードが持つ参照値のうち、参照先から外したエンティティを指すものも直す
-- 書き換えたレコードは、modified_at で差分を取る連携先にも変更が伝わるよう modified_at も更新する（更新者に当たるユーザーはいないため modified_by はそのままにする）

-- 1. 多態参照だった参照項目の参照先を 1 つのエンティティに絞り込む
UPDATE [ei]
SET [reference_entities] = N'["account"]'
FROM [entity_item] AS [ei]
INNER JOIN [entity] AS [e] ON [e].[id] = [ei].[entity_id]
WHERE [e].[name] = N'activity' AND [ei].[name] = N'target';

UPDATE [ei]
SET [reference_entities] = N'["user"]'
FROM [entity_item] AS [ei]
INNER JOIN [entity] AS [e] ON [e].[id] = [ei].[entity_id]
WHERE [e].[name] = N'activity' AND [ei].[name] IN (N'required_attendees', N'optional_attendees', N'organizer');

UPDATE [ei]
SET [reference_entities] = N'["contact"]'
FROM [entity_item] AS [ei]
INNER JOIN [entity] AS [e] ON [e].[id] = [ei].[entity_id]
WHERE [e].[name] = N'phone_call' AND [ei].[name] = N'their';

-- 2. activity の参照値のうち、参照先から外したエンティティを指すものを NULL にする（いずれも任意入力の項目）
UPDATE [activity] SET [target] = NULL, [modified_at] = GETUTCDATE() WHERE JSON_VALUE([target], '$.entity_name') <> N'account';
UPDATE [activity] SET [required_attendees] = NULL, [modified_at] = GETUTCDATE() WHERE JSON_VALUE([required_attendees], '$.entity_name') <> N'user';
UPDATE [activity] SET [optional_attendees] = NULL, [modified_at] = GETUTCDATE() WHERE JSON_VALUE([optional_attendees], '$.entity_name') <> N'user';
UPDATE [activity] SET [organizer] = NULL, [modified_at] = GETUTCDATE() WHERE JSON_VALUE([organizer], '$.entity_name') <> N'user';

-- 3. phone_call の相手方（their）のうち、contact 以外を指すものを contact に置き換える
-- 必須入力の項目で NULL にできないため、元の相手に関係のある取引先責任者を次の優先順で割り当て、電話番号もその取引先責任者の携帯電話番号にする（seed と同じ）
--   1. 元の相手が取引先なら、その取引先に属する取引先責任者
--   2. 元の相手がリードなら、そのリードから作られた取引先責任者
--   3. 上のどちらもなければ、作成日時が最も古い取引先責任者
IF EXISTS (SELECT 1 FROM [phone_call] WHERE JSON_VALUE([their], '$.entity_name') <> N'contact')
  AND NOT EXISTS (SELECT 1 FROM [contact] WHERE [is_deleted] = 0)
BEGIN
  THROW 50000, N'phone_call.their を置き換えられる取引先責任者（contact）がありません', 1;
END;

UPDATE [pc]
SET
  [their] = (SELECT N'contact' AS [entity_name], LOWER([c].[id]) AS [id] FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
  [phone_number] = [c].[mobile_phone_number],
  [modified_at] = GETUTCDATE()
FROM [phone_call] AS [pc]
CROSS APPLY (
  SELECT TOP 1 [contact].[id], [contact].[mobile_phone_number]
  FROM [contact]
  WHERE [contact].[is_deleted] = 0
  ORDER BY
    CASE
      WHEN JSON_VALUE([pc].[their], '$.entity_name') = N'account'
        AND JSON_VALUE([contact].[account], '$.id') = JSON_VALUE([pc].[their], '$.id') THEN 0
      WHEN JSON_VALUE([pc].[their], '$.entity_name') = N'lead'
        AND JSON_VALUE([contact].[originating_lead], '$.id') = JSON_VALUE([pc].[their], '$.id') THEN 0
      ELSE 1
    END,
    [contact].[created_at],
    [contact].[id]
) AS [c]
WHERE JSON_VALUE([pc].[their], '$.entity_name') <> N'contact';

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
  ROLLBACK TRAN;
END;
THROW

END CATCH
