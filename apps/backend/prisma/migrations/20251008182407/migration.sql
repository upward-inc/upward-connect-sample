BEGIN TRY

BEGIN TRAN;

-- 1. entity_itemテーブル → entityテーブルへの外部キー制約を削除
--    (テーブル再作成の前に参照を切る必要がある)
ALTER TABLE [dbo].[entity_item] DROP CONSTRAINT [fk_entity_item_entity_id];

-- 2. entityテーブル → userテーブルへの外部キー制約を2つ削除
--    (テーブル削除の前に参照を切る必要がある)
ALTER TABLE [dbo].[entity] DROP CONSTRAINT [fk_entity_created_by];
ALTER TABLE [dbo].[entity] DROP CONSTRAINT [fk_entity_modified_by];

-- 3. 既存のentityテーブルのデータを一時テーブルに退避
SELECT
  [id], [name], [display_name], [order],
  [created_at], [created_by], [modified_at], [modified_by]
INTO [dbo].[entity_temp]
FROM [dbo].[entity];

-- 4. entityテーブルを削除
DROP TABLE [dbo].[entity];

-- 5. 正しいカラム順序でentityテーブルを再作成
CREATE TABLE [dbo].[entity] (
  [id] UNIQUEIDENTIFIER NOT NULL DEFAULT newid(),
  [name] NVARCHAR(255) NOT NULL,
  [display_name] NVARCHAR(255) NOT NULL,
  [order] SMALLINT NOT NULL DEFAULT 0,
  [title_field_name] NVARCHAR(255) NOT NULL,
  [created_at] DATETIME NOT NULL DEFAULT getutcdate(),
  [created_by] UNIQUEIDENTIFIER NOT NULL,
  [modified_at] DATETIME NOT NULL DEFAULT getutcdate(),
  [modified_by] UNIQUEIDENTIFIER NOT NULL,
  CONSTRAINT [pk_entity] PRIMARY KEY CLUSTERED ([id]),
  CONSTRAINT [uk_entity_1] UNIQUE NONCLUSTERED ([name])
);

-- 6. 一時テーブルからデータを復元 (title_field_nameはデフォルト値)
INSERT INTO [dbo].[entity]
  ([id], [name], [display_name], [order], [title_field_name],
   [created_at], [created_by], [modified_at], [modified_by])
SELECT
  [id], [name], [display_name], [order], '', -- title_field_nameはデフォルト値
  [created_at], [created_by], [modified_at], [modified_by]
FROM [dbo].[entity_temp];

-- 7. 一時テーブルを削除
DROP TABLE [dbo].[entity_temp];

-- 8. entityテーブル → userテーブルへの外部キー制約を再作成
ALTER TABLE [dbo].[entity]
  ADD CONSTRAINT [fk_entity_created_by]
  FOREIGN KEY ([created_by]) REFERENCES [dbo].[user]([id])
  ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[entity]
  ADD CONSTRAINT [fk_entity_modified_by]
  FOREIGN KEY ([modified_by]) REFERENCES [dbo].[user]([id])
  ON DELETE NO ACTION ON UPDATE NO ACTION;

-- 9. entity_itemテーブル → entityテーブルへの外部キー制約を再作成
ALTER TABLE [dbo].[entity_item]
  ADD CONSTRAINT [fk_entity_item_entity_id]
  FOREIGN KEY ([entity_id]) REFERENCES [dbo].[entity]([id])
  ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
  ROLLBACK TRAN;
END;
THROW

END CATCH
