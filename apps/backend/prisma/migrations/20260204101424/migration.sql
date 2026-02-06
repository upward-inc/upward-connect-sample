BEGIN TRY

BEGIN TRAN;

-- 1. 既存のテーブルのデータを一時テーブルに退避
SELECT *
INTO [activity_temp]
FROM [activity];

-- 2. 既存のテーブルを削除
DROP TABLE [activity];

-- 3. 新しいスキーマでテーブルを再作成
CREATE TABLE [activity]
(
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [df_activity_id] DEFAULT newid(),
    [subject] NVARCHAR(256),
    [target] NVARCHAR(256),
    [contact] NVARCHAR(256),
    [start_date_time] DATETIME,
    [end_date_time] DATETIME,
    [is_all_day_event] BIT NOT NULL CONSTRAINT [df_activity_is_all_day_event] DEFAULT 0,
    [actual_start_date_time] DATETIME,
    [actual_end_date_time] DATETIME,
    [status] NVARCHAR(max),
    [required_attendees] NVARCHAR(max),
    [optional_attendees] NVARCHAR(max),
    [organizer] NVARCHAR(max),
    [meeting_url] NVARCHAR(max),
    [description] NVARCHAR(max),
    [start_latitude] DECIMAL(18,15),
    [start_longitude] DECIMAL(18,15),
    [finish_latitude] DECIMAL(18,15),
    [finish_longitude] DECIMAL(18,15),
    [working_latitude] DECIMAL(18,15),
    [working_longitude] DECIMAL(18,15),
    [is_archived] BIT NOT NULL CONSTRAINT [df_activity_is_archived] DEFAULT 0,
    [is_deleted] BIT NOT NULL CONSTRAINT [df_activity_is_deleted] DEFAULT 0,
    [owner] NVARCHAR(max) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [df_activity_created_at] DEFAULT getutcdate(),
    [created_by] NVARCHAR(max) NOT NULL,
    [modified_at] DATETIME2 NOT NULL CONSTRAINT [df_activity_modified_at] DEFAULT getutcdate(),
    [modified_by] NVARCHAR(max) NOT NULL,
    CONSTRAINT [pk_activity] PRIMARY KEY CLUSTERED ([id])
);

-- 4. 一時テーブルからデータを新しいテーブルに移行
INSERT INTO [activity] (
    [id],
    [subject],
    [target],
    [start_date_time],
    [end_date_time],
    [is_all_day_event],
    [actual_start_date_time],
    [actual_end_date_time],
    [status],
    [required_attendees],
    [optional_attendees],
    [organizer],
    [meeting_url],
    [description],
    [start_latitude],
    [start_longitude],
    [finish_latitude],
    [finish_longitude],
    [working_latitude],
    [working_longitude],
    [is_archived],
    [is_deleted],
    [owner],
    [created_at],
    [created_by],
    [modified_at],
    [modified_by]
)
SELECT
    [id],
    [subject],
    [target],
    [start_date_time],
    [end_date_time],
    [is_all_day_event],
    [actual_start_date_time],
    [actual_end_date_time],
    [status],
    [required_attendees],
    [optional_attendees],
    [organizer],
    [meeting_url],
    [description],
    [start_latitude],
    [start_longitude],
    [finish_latitude],
    [finish_longitude],
    [working_latitude],
    [working_longitude],
    [is_archived],
    [is_deleted],
    [owner],
    [created_at],
    [created_by],
    [modified_at],
    [modified_by]
FROM [activity_temp];

-- 5. 一時テーブルを削除
DROP TABLE [activity_temp];

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
  ROLLBACK TRAN;
END;
THROW

END CATCH
