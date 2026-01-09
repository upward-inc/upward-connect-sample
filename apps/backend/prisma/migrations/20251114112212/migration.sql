BEGIN TRY

BEGIN TRAN;

-- 1. 既存のテーブルのデータを一時テーブルに退避
SELECT *
INTO [account_temp]
FROM [account];

SELECT *
INTO [lead_temp]
FROM [lead];

SELECT *
INTO [sample_temp]
FROM [sample];

-- 2. 既存のテーブルを削除
DROP TABLE [account];
DROP TABLE [lead];
DROP TABLE [sample];

-- 3. 新しいスキーマでテーブルを再作成
CREATE TABLE [account]
(
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [df_account_id] DEFAULT newid(),
    [name] NVARCHAR(256) NOT NULL,
    [account_number] NVARCHAR(20),
    [main_phone_number] NVARCHAR(50),
    [sub_phone_number] NVARCHAR(50),
    [website] NVARCHAR(max),
    [industry] NVARCHAR(max),
    [number_of_employees] DECIMAL(6,0),
    [revenue] DECIMAL(16,0),
    [address_zipcode] NVARCHAR(20),
    [address_prefecture] NVARCHAR(256),
    [address_municipality] NVARCHAR(256),
    [address_street] NVARCHAR(256),
    [location] geography,
    [market_cap] DECIMAL(16,0),
    [description] NVARCHAR(max),
    [originating_lead] NVARCHAR(max),
    [parent] NVARCHAR(max),
    [is_deleted] BIT NOT NULL CONSTRAINT [df_account_is_deleted] DEFAULT 0,
    [owner] NVARCHAR(max) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [df_account_created_at] DEFAULT getutcdate(),
    [created_by] NVARCHAR(max) NOT NULL,
    [modified_at] DATETIME2 NOT NULL CONSTRAINT [df_account_modified_at] DEFAULT getutcdate(),
    [modified_by] NVARCHAR(max) NOT NULL,
    CONSTRAINT [pk_account] PRIMARY KEY CLUSTERED ([id])
);

CREATE TABLE [lead]
(
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [df_lead_id] DEFAULT newid(),
    [company] NVARCHAR(256) NOT NULL,
    [first_name] NVARCHAR(256),
    [last_name] NVARCHAR(256) NOT NULL,
    [business_unit] NVARCHAR(256),
    [title] NVARCHAR(256),
    [address_zipcode] NVARCHAR(20),
    [address_prefecture] NVARCHAR(256),
    [address_municipality] NVARCHAR(256),
    [address_street] NVARCHAR(256),
    [location] geography,
    [phone_number] NVARCHAR(50),
    [email] NVARCHAR(max),
    [website] NVARCHAR(max),
    [description] NVARCHAR(max),
    [lead_source] NVARCHAR(max),
    [status] NVARCHAR(max) NOT NULL,
    [industry] NVARCHAR(max),
    [rating] NVARCHAR(max),
    [annual_revenue] DECIMAL(16,0),
    [number_of_employees] DECIMAL(6,0),
    [is_converted] BIT CONSTRAINT [df_lead_is_converted] DEFAULT 0,
    [converted_date] DATE,
    [is_deleted] BIT NOT NULL CONSTRAINT [df_lead_is_deleted] DEFAULT 0,
    [owner] NVARCHAR(max) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [df_lead_created_at] DEFAULT getutcdate(),
    [created_by] NVARCHAR(max) NOT NULL,
    [modified_at] DATETIME2 NOT NULL CONSTRAINT [df_lead_modified_at] DEFAULT getutcdate(),
    [modified_by] NVARCHAR(max) NOT NULL,
    CONSTRAINT [pk_lead] PRIMARY KEY CLUSTERED ([id])
);

-- sampleテーブル
CREATE TABLE [sample]
(
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [df_sample_id] DEFAULT newid(),
    [name] NVARCHAR(256) NOT NULL,
    [text] NVARCHAR(max),
    [textarea] NVARCHAR(max),
    [phone_number] NVARCHAR(50),
    [email] NVARCHAR(max),
    [url] NVARCHAR(max),
    [combobox] NVARCHAR(max),
    [integer] DECIMAL(16,0),
    [decimal] DECIMAL(16,2),
    [boolean] BIT CONSTRAINT [df_sample_boolean] DEFAULT 0,
    [date] DATE,
    [datetime] DATETIME,
    [time] TIME,
    [option_single] NVARCHAR(max),
    [option_multi] NVARCHAR(max),
    [reference_single_target_single_id] NVARCHAR(max),
    [reference_single_target_multi_id] NVARCHAR(max),
    [reference_multi_target_single_id] NVARCHAR(max),
    [reference_multi_target_multi_id] NVARCHAR(max),
    [address_zipcode] NVARCHAR(20),
    [address_prefecture] NVARCHAR(256),
    [address_municipality] NVARCHAR(256),
    [address_street] NVARCHAR(256),
    [location] geography,
    [is_deleted] BIT NOT NULL CONSTRAINT [df_sample_is_deleted] DEFAULT 0,
    [owner] NVARCHAR(max) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [df_sample_created_at] DEFAULT getutcdate(),
    [created_by] NVARCHAR(max) NOT NULL,
    [modified_at] DATETIME2 NOT NULL CONSTRAINT [df_sample_modified_at] DEFAULT getutcdate(),
    [modified_by] NVARCHAR(max) NOT NULL,
    CONSTRAINT [pk_sample] PRIMARY KEY CLUSTERED ([id])
);

-- 4. 一時テーブルからデータを新しいテーブルに移行
INSERT INTO [account]
(
    [id],
    [name],
    [account_number],
    [main_phone_number],
    [sub_phone_number],
    [website],
    [industry],
    [number_of_employees],
    [revenue],
    [address_zipcode],
    [address_prefecture],
    [address_municipality],
    [address_street],
    [location],
    [market_cap],
    [description],
    [originating_lead],
    [parent],
    [is_deleted],
    [owner],
    [created_at],
    [created_by],
    [modified_at],
    [modified_by]
)
SELECT
    [id],
    [name],
    [account_number],
    [main_phone_number],
    [sub_phone_number],
    [website],
    [industry],
    [number_of_employees],
    [revenue],
    [address_zipcode],
    [address_prefecture],
    [address_municipality],
    [address_street],
    CASE 
        WHEN [latitude] IS NOT NULL AND [longitude] IS NOT NULL
        THEN geography::Point([latitude], [longitude], 4326)
        ELSE NULL
    END AS location,
    [market_cap],
    [description],
    [originating_lead],
    [parent],
    [is_deleted],
    [owner],
    [created_at],
    [created_by],
    [modified_at],
    [modified_by]
FROM [account_temp];

INSERT INTO [lead]
(
    [id],
    [company],
    [first_name],
    [last_name],
    [business_unit],
    [title],
    [address_zipcode],
    [address_prefecture],
    [address_municipality],
    [address_street],
    [location],
    [phone_number],
    [email],
    [website],
    [description],
    [lead_source],
    [status],
    [industry],
    [rating],
    [annual_revenue],
    [number_of_employees],
    [is_converted],
    [converted_date],
    [is_deleted],
    [owner],
    [created_at],
    [created_by],
    [modified_at],
    [modified_by]
)
SELECT
    [id],
    [company],
    [first_name],
    [last_name],
    [business_unit],
    [title],
    [address_zipcode],
    [address_prefecture],
    [address_municipality],
    [address_street],
    CASE 
        WHEN [latitude] IS NOT NULL AND [longitude] IS NOT NULL
        THEN geography::Point([latitude], [longitude], 4326)
        ELSE NULL
    END AS location,
    [phone_number],
    [email],
    [website],
    [description],
    [lead_source],
    [status],
    [industry],
    [rating],
    [annual_revenue],
    [number_of_employees],
    [is_converted],
    [converted_date],
    [is_deleted],
    [owner],
    [created_at],
    [created_by],
    [modified_at],
    [modified_by]
FROM [lead_temp];

INSERT INTO [sample]
(
    [id],
    [name],
    [text],
    [textarea],
    [phone_number],
    [email],
    [url],
    [combobox],
    [integer],
    [decimal],
    [boolean],
    [date],
    [datetime],
    [time],
    [option_single],
    [option_multi],
    [reference_single_target_single_id],
    [reference_single_target_multi_id],
    [reference_multi_target_single_id],
    [reference_multi_target_multi_id],
    [is_deleted],
    [owner],
    [created_at],
    [created_by],
    [modified_at],
    [modified_by]
)
SELECT
    [id],
    [name],
    [text],
    [textarea],
    [phone_number],
    [email],
    [url],
    [combobox],
    [integer],
    [decimal],
    [boolean],
    [date],
    [datetime],
    [time],
    [option_single],
    [option_multi],
    [reference_single_target_single_id],
    [reference_single_target_multi_id],
    [reference_multi_target_single_id],
    [reference_multi_target_multi_id],
    [is_deleted],
    [owner],
    [created_at],
    [created_by],
    [modified_at],
    [modified_by]
FROM [sample_temp];

-- 5. 一時テーブルを削除
DROP TABLE [account_temp];
DROP TABLE [lead_temp];
DROP TABLE [sample_temp];

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
  ROLLBACK TRAN;
END;
THROW

END CATCH