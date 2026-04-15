BEGIN TRY

BEGIN TRAN;

-- 1. 既存のテーブルのデータを一時テーブルに退避
SELECT *
INTO [file_temp]
FROM [file];

-- 2. 既存のテーブルを削除
DROP TABLE [file];

-- 3. 新しいスキーマでテーブルを再作成
CREATE TABLE [file]
(
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [df_file_id] DEFAULT newid(),
    [name] NVARCHAR(255) NOT NULL,
    [type] NVARCHAR(20) NOT NULL,
    [content] VARBINARY(max) NOT NULL,
    [source_record] NVARCHAR(max) NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [df_file_created_at] DEFAULT getutcdate(),
    [created_by] UNIQUEIDENTIFIER NOT NULL,
    [modified_at] DATETIME2 NOT NULL CONSTRAINT [df_file_modified_at] DEFAULT getutcdate(),
    [modified_by] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [pk_file] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [fk_file_created_by] FOREIGN KEY ([created_by]) REFERENCES [user]([id]),
    CONSTRAINT [fk_file_modified_by] FOREIGN KEY ([modified_by]) REFERENCES [user]([id])
);

-- 4. 一時テーブルからデータを新しいテーブルに移行
INSERT INTO [file] (
    [id],
    [name],
    [type],
    [content],
    [created_at],
    [created_by],
    [modified_at],
    [modified_by]
)
SELECT
    [id],
    [name],
    [type],
    [content],
    [created_at],
    [created_by],
    [modified_at],
    [modified_by]
FROM [file_temp];

-- 5. 一時テーブルを削除
DROP TABLE [file_temp];

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
  ROLLBACK TRAN;
END;
THROW

END CATCH
