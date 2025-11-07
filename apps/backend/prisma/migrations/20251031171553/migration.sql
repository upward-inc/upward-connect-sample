BEGIN TRY

BEGIN TRAN;

/*
外部キーの考慮を含め、CREATE TABLEの順番は以下の通りとする (DROP TABLEは逆順)

1. jwk_private_key
2. oauth_client
3. user
4. profile
5. role
6. user_access_control
7. entity
8. entity_item
9. entity_item_option
10. lead
11. account
12. contact
13. case
14. product
15. campaign
16. activity
17. phone_call
18. opportunity
19. sample
20. file
21. published_auth_code
*/

-- 1. 既存のテーブルのデータを一時テーブルに退避
SELECT *
INTO [jwk_private_key_temp]
FROM [jwk_private_key];

SELECT *
INTO [oauth_client_temp]
FROM [oauth_client];

SELECT *
INTO [user_temp]
FROM [user];

SELECT *
INTO [profile_temp]
FROM [profile];

SELECT *
INTO [role_temp]
FROM [role];

SELECT *
INTO [user_access_control_temp]
FROM [user_access_control];

SELECT *
INTO [entity_temp]
FROM [entity];

SELECT *
INTO [entity_item_temp]
FROM [entity_item];

SELECT *
INTO [entity_item_option_temp]
FROM [entity_item_option];

SELECT *
INTO [lead_temp]
FROM [lead];

SELECT *
INTO [account_temp]
FROM [account];

SELECT *
INTO [contact_temp]
FROM [contact];

SELECT *
INTO [case_temp]
FROM [case];

SELECT *
INTO [product_temp]
FROM [product];

SELECT *
INTO [campaign_temp]
FROM [campaign];

SELECT *
INTO [activity_temp]
FROM [activity];

SELECT *
INTO [phone_call_temp]
FROM [phone_call];

SELECT *
INTO [opportunity_temp]
FROM [opportunity];

SELECT *
INTO [sample_temp]
FROM [sample];

SELECT *
INTO [file_temp]
FROM [file];

SELECT *
INTO [published_auth_code_temp]
FROM [published_auth_code];

-- 2. 外部キー制約を削除
-- published_auth_codeテーブル
IF EXISTS (SELECT *
FROM sys.foreign_keys
WHERE name = 'fk_published_auth_code_user_id')
    ALTER TABLE [published_auth_code] DROP CONSTRAINT [fk_published_auth_code_user_id];

-- fileテーブル
IF EXISTS (SELECT *
FROM sys.foreign_keys
WHERE name = 'fk_file_created_by')
    ALTER TABLE [file] DROP CONSTRAINT [fk_file_created_by];
IF EXISTS (SELECT *
FROM sys.foreign_keys
WHERE name = 'fk_file_modified_by')
    ALTER TABLE [file] DROP CONSTRAINT [fk_file_modified_by];

-- user_access_controlテーブル
IF EXISTS (SELECT *
FROM sys.foreign_keys
WHERE name = 'fk_user_access_control_user_id')
    ALTER TABLE [user_access_control] DROP CONSTRAINT [fk_user_access_control_user_id];
IF EXISTS (SELECT *
FROM sys.foreign_keys
WHERE name = 'fk_user_access_control_profile_id')
    ALTER TABLE [user_access_control] DROP CONSTRAINT [fk_user_access_control_profile_id];
IF EXISTS (SELECT *
FROM sys.foreign_keys
WHERE name = 'fk_user_access_control_role_id')
    ALTER TABLE [user_access_control] DROP CONSTRAINT [fk_user_access_control_role_id];
IF EXISTS (SELECT *
FROM sys.foreign_keys
WHERE name = 'fk_user_access_control_created_by')
    ALTER TABLE [user_access_control] DROP CONSTRAINT [fk_user_access_control_created_by];
IF EXISTS (SELECT *
FROM sys.foreign_keys
WHERE name = 'fk_user_access_control_modified_by')
    ALTER TABLE [user_access_control] DROP CONSTRAINT [fk_user_access_control_modified_by];

-- roleテーブル
IF EXISTS (SELECT *
FROM sys.foreign_keys
WHERE name = 'fk_role_created_by')
    ALTER TABLE [role] DROP CONSTRAINT [fk_role_created_by];
IF EXISTS (SELECT *
FROM sys.foreign_keys
WHERE name = 'fk_role_modified_by')
    ALTER TABLE [role] DROP CONSTRAINT [fk_role_modified_by];
IF EXISTS (SELECT *
FROM sys.foreign_keys
WHERE name = 'fk_role_parent_id')
    ALTER TABLE [role] DROP CONSTRAINT [fk_role_parent_id];

-- profileテーブル
IF EXISTS (SELECT *
FROM sys.foreign_keys
WHERE name = 'fk_profile_created_by')
    ALTER TABLE [profile] DROP CONSTRAINT [fk_profile_created_by];
IF EXISTS (SELECT *
FROM sys.foreign_keys
WHERE name = 'fk_profile_modified_by')
    ALTER TABLE [profile] DROP CONSTRAINT [fk_profile_modified_by];

-- entityテーブル
IF EXISTS (SELECT *
FROM sys.foreign_keys
WHERE name = 'fk_entity_created_by')
    ALTER TABLE [entity] DROP CONSTRAINT [fk_entity_created_by];
IF EXISTS (SELECT *
FROM sys.foreign_keys
WHERE name = 'fk_entity_modified_by')
    ALTER TABLE [entity] DROP CONSTRAINT [fk_entity_modified_by];

-- entity_itemテーブル
IF EXISTS (SELECT *
FROM sys.foreign_keys
WHERE name = 'fk_entity_item_entity_id')
    ALTER TABLE [entity_item] DROP CONSTRAINT [fk_entity_item_entity_id];
IF EXISTS (SELECT *
FROM sys.foreign_keys
WHERE name = 'fk_entity_item_created_by')
    ALTER TABLE [entity_item] DROP CONSTRAINT [fk_entity_item_created_by];
IF EXISTS (SELECT *
FROM sys.foreign_keys
WHERE name = 'fk_entity_item_modified_by')
    ALTER TABLE [entity_item] DROP CONSTRAINT [fk_entity_item_modified_by];

-- entity_item_optionテーブル
IF EXISTS (SELECT *
FROM sys.foreign_keys
WHERE name = 'fk_entity_item_entity_item_id')
    ALTER TABLE [entity_item_option] DROP CONSTRAINT [fk_entity_item_entity_item_id];
IF EXISTS (SELECT *
FROM sys.foreign_keys
WHERE name = 'fk_entity_item_option_created_by')
    ALTER TABLE [entity_item_option] DROP CONSTRAINT [fk_entity_item_option_created_by];
IF EXISTS (SELECT *
FROM sys.foreign_keys
WHERE name = 'fk_entity_item_option_modified_by')
    ALTER TABLE [entity_item_option] DROP CONSTRAINT [fk_entity_item_option_modified_by];

-- 3. 既存のテーブルを削除
DROP TABLE IF EXISTS [published_auth_code];
DROP TABLE IF EXISTS [file];
DROP TABLE IF EXISTS [sample];
DROP TABLE IF EXISTS [opportunity];
DROP TABLE IF EXISTS [phone_call];
DROP TABLE IF EXISTS [activity];
DROP TABLE IF EXISTS [campaign];
DROP TABLE IF EXISTS [product];
DROP TABLE IF EXISTS [case];
DROP TABLE IF EXISTS [contact];
DROP TABLE IF EXISTS [account];
DROP TABLE IF EXISTS [lead];
DROP TABLE IF EXISTS [entity_item_option];
DROP TABLE IF EXISTS [entity_item];
DROP TABLE IF EXISTS [entity];
DROP TABLE IF EXISTS [user_access_control];
DROP TABLE IF EXISTS [role];
DROP TABLE IF EXISTS [profile];
DROP TABLE IF EXISTS [user];
DROP TABLE IF EXISTS [oauth_client];
DROP TABLE IF EXISTS [jwk_private_key];


-- 4. テーブルを再作成
-- jwk_private_keyテーブル
CREATE TABLE [jwk_private_key]
(
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [df_jwk_private_key_id] DEFAULT NEWID(),
    [encrypted_private_key_pem] NVARCHAR(max) NOT NULL,
    [base64_iv] NVARCHAR(64) NOT NULL,
    [validate_at] DATETIME2 NOT NULL,
    [expire_at] DATETIME2 NOT NULL,
    [closed_at] DATETIME2 NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [df_jwk_private_key_created_at] DEFAULT GETUTCDATE(),
    CONSTRAINT [pk_private_key] PRIMARY KEY ([id]),
);

-- oauth_clientテーブル
CREATE TABLE [oauth_client]
(
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [df_oauth_client_id] DEFAULT NEWID(),
    [name] NVARCHAR(20),
    [secret] NVARCHAR(MAX) NOT NULL,
    [redirect_uris] NVARCHAR(MAX) NOT NULL,
    [scopes] NVARCHAR(MAX) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [df_oauth_client_created_at] DEFAULT GETUTCDATE(),
    [modified_at] DATETIME2 NOT NULL CONSTRAINT [df_oauth_client_modified_at] DEFAULT GETUTCDATE(),
    CONSTRAINT [pk_oauth_client] PRIMARY KEY ([id]),
);

-- userテーブル
CREATE TABLE [user]
(
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [df_user_id] DEFAULT newid(),
    [user_name] NVARCHAR(256) NOT NULL,
    [hashed_password] NVARCHAR(max) NOT NULL,
    [first_name] NVARCHAR(256) NOT NULL,
    [last_name] NVARCHAR(256) NOT NULL,
    [email] NVARCHAR(max),
    [timezone] NVARCHAR(max),
    [locale] NVARCHAR(max),
    [is_active] BIT NOT NULL CONSTRAINT [df_user_is_active] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [df_user_created_at] DEFAULT getutcdate(),
    [modified_at] DATETIME2 NOT NULL CONSTRAINT [df_user_modified_at] DEFAULT getutcdate(),
    CONSTRAINT [pk_user] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [uk_user_1] UNIQUE NONCLUSTERED ([user_name])
);

-- profileテーブル
CREATE TABLE [profile]
(
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [df_profile_id] DEFAULT newid(),
    [name] NVARCHAR(256) NOT NULL,
    [display_name] NVARCHAR(256) NOT NULL,
    [order] SMALLINT NOT NULL CONSTRAINT [df_profile_order] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [df_profile_created_at] DEFAULT getutcdate(),
    [created_by] UNIQUEIDENTIFIER NOT NULL,
    [modified_at] DATETIME2 NOT NULL CONSTRAINT [df_profile_modified_at] DEFAULT getutcdate(),
    [modified_by] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [pk_profile] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [uk_profile_1] UNIQUE NONCLUSTERED ([name]),
    CONSTRAINT [fk_profile_created_by] FOREIGN KEY ([created_by]) REFERENCES [user] ([id]),
    CONSTRAINT [fk_profile_modified_by] FOREIGN KEY ([modified_by]) REFERENCES [user] ([id])
);

-- roleテーブル
CREATE TABLE [role]
(
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [df_role_id] DEFAULT newid(),
    [name] NVARCHAR(256) NOT NULL,
    [display_name] NVARCHAR(256) NOT NULL,
    [order] SMALLINT NOT NULL CONSTRAINT [df_role_order] DEFAULT 0,
    [parent_id] UNIQUEIDENTIFIER,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [df_role_created_at] DEFAULT getutcdate(),
    [created_by] UNIQUEIDENTIFIER NOT NULL,
    [modified_at] DATETIME2 NOT NULL CONSTRAINT [df_role_modified_at] DEFAULT getutcdate(),
    [modified_by] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [pk_role] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [uk_role_1] UNIQUE NONCLUSTERED ([name]),
    CONSTRAINT [fk_role_created_by] FOREIGN KEY ([created_by]) REFERENCES [user] ([id]),
    CONSTRAINT [fk_role_modified_by] FOREIGN KEY ([modified_by]) REFERENCES [user] ([id]),
    CONSTRAINT [fk_role_parent_id] FOREIGN KEY ([parent_id]) REFERENCES [role] ([id])
);

-- user_access_controlテーブル
CREATE TABLE [user_access_control]
(
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [df_user_access_control_id] DEFAULT newid(),
    [user_id] UNIQUEIDENTIFIER NOT NULL,
    [profile_id] UNIQUEIDENTIFIER NOT NULL,
    [role_id] UNIQUEIDENTIFIER,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [df_user_access_control_created_at] DEFAULT getutcdate(),
    [created_by] UNIQUEIDENTIFIER NOT NULL,
    [modified_at] DATETIME2 NOT NULL CONSTRAINT [df_user_access_control_modified_at] DEFAULT getutcdate(),
    [modified_by] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [pk_user_access_control] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [uk_user_access_control_1] UNIQUE NONCLUSTERED ([user_id]),
    CONSTRAINT [fk_user_access_control_user_id] FOREIGN KEY ([user_id]) REFERENCES [user] ([id]),
    CONSTRAINT [fk_user_access_control_profile_id] FOREIGN KEY ([profile_id]) REFERENCES [profile] ([id]),
    CONSTRAINT [fk_user_access_control_role_id] FOREIGN KEY ([role_id]) REFERENCES [role] ([id]),
    CONSTRAINT [fk_user_access_control_created_by] FOREIGN KEY ([created_by]) REFERENCES [user] ([id]),
    CONSTRAINT [fk_user_access_control_modified_by] FOREIGN KEY ([modified_by]) REFERENCES [user] ([id])
);

-- entityテーブル
CREATE TABLE [entity]
(
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [df_entity_id] DEFAULT newid(),
    [name] NVARCHAR(255) NOT NULL,
    [display_name] NVARCHAR(255) NOT NULL,
    [order] SMALLINT NOT NULL CONSTRAINT [df_entity_order] DEFAULT 0,
    [title_field_name] NVARCHAR(255) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [df_entity_created_at] DEFAULT getutcdate(),
    [created_by] UNIQUEIDENTIFIER NOT NULL,
    [modified_at] DATETIME2 NOT NULL CONSTRAINT [df_entity_modified_at] DEFAULT getutcdate(),
    [modified_by] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [pk_entity] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [uk_entity_1] UNIQUE NONCLUSTERED ([name]),
    CONSTRAINT [fk_entity_created_by] FOREIGN KEY ([created_by]) REFERENCES [user] ([id]),
    CONSTRAINT [fk_entity_modified_by] FOREIGN KEY ([modified_by]) REFERENCES [user] ([id])
);

-- entity_itemテーブル
CREATE TABLE [entity_item]
(
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [df_entity_item_id] DEFAULT newid(),
    [entity_id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [display_name] NVARCHAR(255) NOT NULL,
    [order] SMALLINT NOT NULL CONSTRAINT [df_entity_item_order] DEFAULT 0,
    [type] NVARCHAR(20) NOT NULL,
    [sub_type] NVARCHAR(20),
    [is_required] BIT NOT NULL CONSTRAINT [df_entity_item_is_required] DEFAULT 0,
    [is_filterable] BIT NOT NULL CONSTRAINT [df_entity_item_is_filterable] DEFAULT 0,
    [is_creatable] BIT NOT NULL CONSTRAINT [df_entity_item_is_creatable] DEFAULT 0,
    [is_updatable] BIT NOT NULL CONSTRAINT [df_entity_item_is_updatable] DEFAULT 0,
    [is_formula] BIT NOT NULL CONSTRAINT [df_entity_item_is_formula] DEFAULT 0,
    [max_length] SMALLINT,
    [precision] SMALLINT,
    [scale] SMALLINT,
    [reference_entities] NVARCHAR(max),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [df_entity_item_created_at] DEFAULT getutcdate(),
    [created_by] UNIQUEIDENTIFIER NOT NULL,
    [modified_at] DATETIME2 NOT NULL CONSTRAINT [df_entity_item_modified_at] DEFAULT getutcdate(),
    [modified_by] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [pk_entity_item] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [uk_entity_item_1] UNIQUE NONCLUSTERED ([entity_id], [name]),
    CONSTRAINT [fk_entity_item_entity_id] FOREIGN KEY ([entity_id]) REFERENCES [entity] ([id]),
    CONSTRAINT [fk_entity_item_created_by] FOREIGN KEY ([created_by]) REFERENCES [user] ([id]),
    CONSTRAINT [fk_entity_item_modified_by] FOREIGN KEY ([modified_by]) REFERENCES [user] ([id])
);

-- entity_item_optionテーブル
CREATE TABLE [entity_item_option]
(
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [df_entity_item_option_id] DEFAULT newid(),
    [entity_item_id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [display_name] NVARCHAR(255) NOT NULL,
    [order] SMALLINT NOT NULL CONSTRAINT [df_entity_item_option_order] DEFAULT 0,
    [is_default] BIT NOT NULL CONSTRAINT [df_entity_item_option_is_default] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [df_entity_item_option_created_at] DEFAULT getutcdate(),
    [created_by] UNIQUEIDENTIFIER NOT NULL,
    [modified_at] DATETIME2 NOT NULL CONSTRAINT [df_entity_item_option_modified_at] DEFAULT getutcdate(),
    [modified_by] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [pk_entity_item_option] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [uk_entity_item_option_1] UNIQUE NONCLUSTERED ([entity_item_id], [name]),
    CONSTRAINT [fk_entity_item_option_entity_item_id] FOREIGN KEY ([entity_item_id]) REFERENCES [entity_item] ([id]),
    CONSTRAINT [fk_entity_item_option_created_by] FOREIGN KEY ([created_by]) REFERENCES [user] ([id]),
    CONSTRAINT [fk_entity_item_option_modified_by] FOREIGN KEY ([modified_by]) REFERENCES [user] ([id])
);

-- leadテーブル
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
    [latitude] DECIMAL(18,15),
    [longitude] DECIMAL(18,15),
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

-- accountテーブル
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
    [latitude] DECIMAL(18,15),
    [longitude] DECIMAL(18,15),
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

-- contactテーブル
CREATE TABLE [contact]
(
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [df_contact_id] DEFAULT newid(),
    [first_name] NVARCHAR(256),
    [last_name] NVARCHAR(256) NOT NULL,
    [gender] NVARCHAR(max),
    [account] NVARCHAR(max),
    [business_unit] NVARCHAR(256),
    [title] NVARCHAR(256),
    [company_phone_number] NVARCHAR(50),
    [mobile_phone_number] NVARCHAR(50),
    [email] NVARCHAR(max),
    [website] NVARCHAR(max),
    [originating_lead] NVARCHAR(max),
    [description] NVARCHAR(max),
    [is_deleted] BIT NOT NULL CONSTRAINT [df_contact_is_deleted] DEFAULT 0,
    [owner] NVARCHAR(max) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [df_contact_created_at] DEFAULT getutcdate(),
    [created_by] NVARCHAR(max) NOT NULL,
    [modified_at] DATETIME2 NOT NULL CONSTRAINT [df_contact_modified_at] DEFAULT getutcdate(),
    [modified_by] NVARCHAR(max) NOT NULL,
    CONSTRAINT [pk_contact] PRIMARY KEY CLUSTERED ([id])
);

-- caseテーブル
CREATE TABLE [case]
(
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [df_case_id] DEFAULT newid(),
    [case_number] NVARCHAR(30) NOT NULL,
    [subject] NVARCHAR(256) NOT NULL,
    [detail] NVARCHAR(max),
    [contact] NVARCHAR(max),
    [account] NVARCHAR(max),
    [parent] NVARCHAR(max),
    [type] NVARCHAR(max),
    [status] NVARCHAR(max),
    [reason] NVARCHAR(max),
    [origin] NVARCHAR(max),
    [priority] NVARCHAR(max),
    [is_escalated] BIT NOT NULL CONSTRAINT [df_case_is_escalated] DEFAULT 0,
    [closed_datetime] DATETIME,
    [description] NVARCHAR(max),
    [is_deleted] BIT NOT NULL CONSTRAINT [df_case_is_deleted] DEFAULT 0,
    [owner] NVARCHAR(max) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [df_case_created_at] DEFAULT getutcdate(),
    [created_by] NVARCHAR(max) NOT NULL,
    [modified_at] DATETIME2 NOT NULL CONSTRAINT [df_case_modified_at] DEFAULT getutcdate(),
    [modified_by] NVARCHAR(max) NOT NULL,
    CONSTRAINT [pk_case] PRIMARY KEY CLUSTERED ([id])
);

-- productテーブル
CREATE TABLE [product]
(
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [df_product_id] DEFAULT newid(),
    [name] NVARCHAR(256) NOT NULL,
    [product] NVARCHAR(256),
    [description] NVARCHAR(max),
    [is_active] BIT NOT NULL CONSTRAINT [df_product_is_active] DEFAULT 0,
    [family] NVARCHAR(max),
    [external_id] NVARCHAR(256),
    [url] NVARCHAR(max),
    [quantity_unit] NVARCHAR(max),
    [is_archived] BIT NOT NULL CONSTRAINT [df_product_is_archived] DEFAULT 0,
    [is_deleted] BIT NOT NULL CONSTRAINT [df_product_is_deleted] DEFAULT 0,
    [owner] NVARCHAR(max) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [df_product_created_at] DEFAULT getutcdate(),
    [created_by] NVARCHAR(max) NOT NULL,
    [modified_at] DATETIME2 NOT NULL CONSTRAINT [df_product_modified_at] DEFAULT getutcdate(),
    [modified_by] NVARCHAR(max) NOT NULL,
    CONSTRAINT [pk_product] PRIMARY KEY CLUSTERED ([id])
);

-- campaignテーブル
CREATE TABLE [campaign]
(
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [df_campaign_id] DEFAULT newid(),
    [name] NVARCHAR(256) NOT NULL,
    [code] NVARCHAR(32),
    [type] NVARCHAR(max),
    [start_date] DATE,
    [end_date] DATE,
    [description] NVARCHAR(max),
    [expected_response] DECIMAL(5,2),
    [budgeted_cost] DECIMAL(16,0),
    [expected_revenue] DECIMAL(16,0),
    [status] NVARCHAR(max),
    [is_deleted] BIT NOT NULL CONSTRAINT [df_campaign_is_deleted] DEFAULT 0,
    [owner] NVARCHAR(max) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [df_campaign_created_at] DEFAULT getutcdate(),
    [created_by] NVARCHAR(max) NOT NULL,
    [modified_at] DATETIME2 NOT NULL CONSTRAINT [df_campaign_modified_at] DEFAULT getutcdate(),
    [modified_by] NVARCHAR(max) NOT NULL,
    CONSTRAINT [pk_campaign] PRIMARY KEY CLUSTERED ([id])
);

-- activityテーブル
CREATE TABLE [activity]
(
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [df_activity_id] DEFAULT newid(),
    [subject] NVARCHAR(256),
    [target] NVARCHAR(256),
    [start_date_time] DATETIME,
    [end_date_time] DATETIME,
    [is_all_day_event] BIT NOT NULL CONSTRAINT [df_activity_is_all_day_event] DEFAULT 0,
    [status] NVARCHAR(max),
    [location] NVARCHAR(256),
    [required_attendees] NVARCHAR(max),
    [optional_attendees] NVARCHAR(max),
    [organizer] NVARCHAR(max),
    [meeting_url] NVARCHAR(max),
    [description] NVARCHAR(max),
    [is_archived] BIT NOT NULL CONSTRAINT [df_activity_is_archived] DEFAULT 0,
    [is_deleted] BIT NOT NULL CONSTRAINT [df_activity_is_deleted] DEFAULT 0,
    [owner] NVARCHAR(max) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [df_activity_created_at] DEFAULT getutcdate(),
    [created_by] NVARCHAR(max) NOT NULL,
    [modified_at] DATETIME2 NOT NULL CONSTRAINT [df_activity_modified_at] DEFAULT getutcdate(),
    [modified_by] NVARCHAR(max) NOT NULL,
    CONSTRAINT [pk_activity] PRIMARY KEY CLUSTERED ([id])
);

-- phone_callテーブル
CREATE TABLE [phone_call]
(
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [df_phone_call_id] DEFAULT newid(),
    [subject] NVARCHAR(256) NOT NULL,
    [user] NVARCHAR(max) NOT NULL,
    [their] NVARCHAR(max) NOT NULL,
    [phone_number] NVARCHAR(50),
    [direction] NVARCHAR(max) NOT NULL,
    [start_date_time] DATETIME,
    [end_date_time] DATETIME,
    [status] NVARCHAR(max),
    [description] NVARCHAR(max),
    [is_deleted] BIT NOT NULL CONSTRAINT [df_phone_call_is_deleted] DEFAULT 0,
    [owner] NVARCHAR(max) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [df_phone_call_created_at] DEFAULT getutcdate(),
    [created_by] NVARCHAR(max) NOT NULL,
    [modified_at] DATETIME2 NOT NULL CONSTRAINT [df_phone_call_modified_at] DEFAULT getutcdate(),
    [modified_by] NVARCHAR(max) NOT NULL,
    CONSTRAINT [pk_phone_call] PRIMARY KEY CLUSTERED ([id])
);

-- opportunityテーブル
CREATE TABLE [opportunity]
(
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [df_opportunity_id] DEFAULT newid(),
    [name] NVARCHAR(256) NOT NULL,
    [account] NVARCHAR(max) NOT NULL,
    [phase] NVARCHAR(max) NOT NULL,
    [amount] DECIMAL(16,0),
    [probability] DECIMAL(5,2),
    [close_date] DATE NOT NULL,
    [type] NVARCHAR(max),
    [next_step] NVARCHAR(256),
    [lead_source] NVARCHAR(max),
    [campaign] NVARCHAR(max),
    [contact] NVARCHAR(max),
    [is_closed] BIT NOT NULL CONSTRAINT [df_opportunity_is_closed] DEFAULT 0,
    [description] NVARCHAR(max),
    [is_deleted] BIT NOT NULL CONSTRAINT [df_opportunity_is_deleted] DEFAULT 0,
    [owner] NVARCHAR(max) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [df_opportunity_created_at] DEFAULT getutcdate(),
    [created_by] NVARCHAR(max) NOT NULL,
    [modified_at] DATETIME2 NOT NULL CONSTRAINT [df_opportunity_modified_at] DEFAULT getutcdate(),
    [modified_by] NVARCHAR(max) NOT NULL,
    CONSTRAINT [pk_opportunity] PRIMARY KEY CLUSTERED ([id])
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
    [is_deleted] BIT NOT NULL CONSTRAINT [df_sample_is_deleted] DEFAULT 0,
    [owner] NVARCHAR(max) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [df_sample_created_at] DEFAULT getutcdate(),
    [created_by] NVARCHAR(max) NOT NULL,
    [modified_at] DATETIME2 NOT NULL CONSTRAINT [df_sample_modified_at] DEFAULT getutcdate(),
    [modified_by] NVARCHAR(max) NOT NULL,
    CONSTRAINT [pk_sample] PRIMARY KEY CLUSTERED ([id])
);

-- fileテーブル
CREATE TABLE [file]
(
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [df_file_id] DEFAULT newid(),
    [name] NVARCHAR(255) NOT NULL,
    [type] NVARCHAR(20) NOT NULL,
    [content] VARBINARY(max) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [df_file_created_at] DEFAULT getutcdate(),
    [created_by] UNIQUEIDENTIFIER NOT NULL,
    [modified_at] DATETIME2 NOT NULL CONSTRAINT [df_file_modified_at] DEFAULT getutcdate(),
    [modified_by] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [pk_file] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [fk_file_created_by] FOREIGN KEY ([created_by]) REFERENCES [user] ([id]),
    CONSTRAINT [fk_file_modified_by] FOREIGN KEY ([modified_by]) REFERENCES [user] ([id])
);

-- published_auth_codeテーブル
CREATE TABLE [published_auth_code]
(
    [auth_code] NVARCHAR(255) NOT NULL,
    [client_id] NVARCHAR(MAX) NOT NULL,
    [client_secret] NVARCHAR(MAX) NOT NULL,
    [redirect_uri] NVARCHAR(MAX) NOT NULL,
    [scope] NVARCHAR(MAX),
    [state] NVARCHAR(MAX),
    [nonce] NVARCHAR(MAX),
    [code_challenge] NVARCHAR(128),
    [code_challenge_method] NVARCHAR(10),
    [published_at] DATETIME2 NOT NULL,
    [expire_at] DATETIME2 NOT NULL,
    [user_id] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [pk_published_auth_code] PRIMARY KEY ([auth_code]),
    CONSTRAINT [fk_published_auth_code_user_id] FOREIGN KEY([user_id]) REFERENCES [user]([id]),
);

-- 5. 一時テーブルからデータを復元
INSERT INTO [jwk_private_key]
SELECT *
FROM [jwk_private_key_temp];

INSERT INTO [oauth_client]
SELECT *
FROM [oauth_client_temp];

INSERT INTO [user]
SELECT *
FROM [user_temp];

INSERT INTO [profile]
SELECT *
FROM [profile_temp];

INSERT INTO [role]
SELECT *
FROM [role_temp];

INSERT INTO [user_access_control]
SELECT *
FROM [user_access_control_temp];

INSERT INTO [entity]
SELECT *
FROM [entity_temp];

INSERT INTO [entity_item]
SELECT *
FROM [entity_item_temp];

INSERT INTO [entity_item_option]
SELECT *
FROM [entity_item_option_temp];

INSERT INTO [lead]
SELECT *
FROM [lead_temp];

INSERT INTO [account]
SELECT *
FROM [account_temp];

INSERT INTO [contact]
SELECT *
FROM [contact_temp];

INSERT INTO [case]
SELECT *
FROM [case_temp];

INSERT INTO [product]
SELECT *
FROM [product_temp];

INSERT INTO [campaign]
SELECT *
FROM [campaign_temp];

INSERT INTO [activity]
SELECT *
FROM [activity_temp];

INSERT INTO [phone_call]
SELECT *
FROM [phone_call_temp];

INSERT INTO [opportunity]
SELECT *
FROM [opportunity_temp];

INSERT INTO [sample]
SELECT *
FROM [sample_temp];

INSERT INTO [file]
SELECT *
FROM [file_temp];

INSERT INTO [published_auth_code]
SELECT *
FROM [published_auth_code_temp];


-- 6. 一時テーブルを削除
DROP TABLE IF EXISTS [jwk_private_key_temp];
DROP TABLE IF EXISTS [oauth_client_temp];
DROP TABLE IF EXISTS [user_temp];
DROP TABLE IF EXISTS [profile_temp];
DROP TABLE IF EXISTS [role_temp];
DROP TABLE IF EXISTS [user_access_control_temp];
DROP TABLE IF EXISTS [entity_temp];
DROP TABLE IF EXISTS [entity_item_temp];
DROP TABLE IF EXISTS [entity_item_option_temp];
DROP TABLE IF EXISTS [lead_temp];
DROP TABLE IF EXISTS [account_temp];
DROP TABLE IF EXISTS [contact_temp];
DROP TABLE IF EXISTS [case_temp];
DROP TABLE IF EXISTS [product_temp];
DROP TABLE IF EXISTS [campaign_temp];
DROP TABLE IF EXISTS [activity_temp];
DROP TABLE IF EXISTS [phone_call_temp];
DROP TABLE IF EXISTS [opportunity_temp];
DROP TABLE IF EXISTS [sample_temp];
DROP TABLE IF EXISTS [file_temp];
DROP TABLE IF EXISTS [published_auth_code_temp];

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
