BEGIN TRY

BEGIN TRAN;

-- 1. 既存のテーブルのデータを一時テーブルに退避
SELECT * INTO [entity_temp] FROM [entity];

-- 2. 外部キー制約を削除
IF EXISTS (SELECT *
FROM sys.foreign_keys
WHERE name = 'fk_entity_item_entity_id')
    ALTER TABLE [entity_item] DROP CONSTRAINT [fk_entity_item_entity_id];

-- 3. 既存のテーブルを削除
DROP TABLE [entity];

-- 4. 新しいテーブルを作成
CREATE TABLE [entity]
(
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [df_entity_id] DEFAULT newid(),
    [name] NVARCHAR(255) NOT NULL,
    [display_name] NVARCHAR(255) NOT NULL,
    [order] SMALLINT NOT NULL CONSTRAINT [df_entity_order] DEFAULT 0,
    [title_field_name] NVARCHAR(255) NOT NULL,
    [has_location] BIT NOT NULL CONSTRAINT [df_entity_has_location] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [df_entity_created_at] DEFAULT getutcdate(),
    [created_by] UNIQUEIDENTIFIER NOT NULL,
    [modified_at] DATETIME2 NOT NULL CONSTRAINT [df_entity_modified_at] DEFAULT getutcdate(),
    [modified_by] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [pk_entity] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [uk_entity_1] UNIQUE NONCLUSTERED ([name]),
    CONSTRAINT [fk_entity_created_by] FOREIGN KEY ([created_by]) REFERENCES [user] ([id]),
    CONSTRAINT [fk_entity_modified_by] FOREIGN KEY ([modified_by]) REFERENCES [user] ([id])
);

-- 5. 一時テーブルからデータを新しいテーブルに移行
INSERT INTO [entity] (
    [id],
    [name],
    [display_name],
    [order],
    [title_field_name],
    [created_at],
    [created_by],
    [modified_at],
    [modified_by]
)
SELECT *
FROM [entity_temp];

-- 6. 一時テーブルを削除
DROP TABLE [entity_temp];

-- 7. 外部キー制約を再作成
ALTER TABLE [entity_item]
ADD CONSTRAINT [fk_entity_item_entity_id] FOREIGN KEY ([entity_id]) REFERENCES [entity] ([id]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
  ROLLBACK TRAN;
END;
THROW

END CATCH
