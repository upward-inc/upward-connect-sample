BEGIN TRY

BEGIN TRAN;

/* 外部キーの考慮を含め、CREATE TABLEの順番は以下の通りとする (DROP TABLEは逆順)
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

/*1. 既存のテーブルのデータを一時テーブルに退避*/
-- jwk_private_keyテーブル
SELECT *
INTO [dbo].[jwk_private_key_temp]
FROM [dbo].[jwk_private_key];

-- oauth_clientテーブル
SELECT *
INTO [dbo].[oauth_client_temp]
FROM [dbo].[oauth_client];

-- userテーブル
SELECT *
INTO [dbo].[user_temp]
FROM [dbo].[user];

-- profileテーブル
SELECT *
INTO [dbo].[profile_temp]
FROM [dbo].[profile];

-- roleテーブル
SELECT *
INTO [dbo].[role_temp]
FROM [dbo].[role];

-- user_access_controlテーブル
SELECT *
INTO [dbo].[user_access_control_temp]
FROM [dbo].[user_access_control];

-- entityテーブル
SELECT *
INTO [dbo].[entity_temp]
FROM [dbo].[entity];

-- entity_itemテーブル
SELECT *
INTO [dbo].[entity_item_temp]
FROM [dbo].[entity_item];

-- entity_item_optionテーブル
SELECT *
INTO [dbo].[entity_item_option_temp]
FROM [dbo].[entity_item_option];

-- leadテーブル
SELECT *
INTO [dbo].[lead_temp]
FROM [dbo].[lead];

-- accountテーブル
SELECT *
INTO [dbo].[account_temp]
FROM [dbo].[account];

-- contactテーブル
SELECT *
INTO [dbo].[contact_temp]
FROM [dbo].[contact];

-- caseテーブル
SELECT *
INTO [dbo].[case_temp]
FROM [dbo].[case];

-- productテーブル
SELECT *
INTO [dbo].[product_temp]
FROM [dbo].[product];

-- campaignテーブル
SELECT *
INTO [dbo].[campaign_temp]
FROM [dbo].[campaign];

-- activityテーブル
SELECT *
INTO [dbo].[activity_temp]
FROM [dbo].[activity];

-- phone_callテーブル
SELECT *
INTO [dbo].[phone_call_temp]
FROM [dbo].[phone_call];

-- opportunityテーブル
SELECT *
INTO [dbo].[opportunity_temp]
FROM [dbo].[opportunity];

-- sampleテーブル
SELECT *
INTO [dbo].[sample_temp]
FROM [dbo].[sample];

-- fileテーブル
SELECT *
INTO [dbo].[file_temp]
FROM [dbo].[file];

-- published_auth_codeテーブル
SELECT *
INTO [dbo].[published_auth_code_temp]
FROM [dbo].[published_auth_code];

/* 2. 外部キー制約を削除  */
-- published_auth_codeテーブル
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'fk_published_auth_code_user_id')
    ALTER TABLE [dbo].[published_auth_code] DROP CONSTRAINT [fk_published_auth_code_user_id];

-- fileテーブル
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'fk_file_created_by')
    ALTER TABLE [dbo].[file] DROP CONSTRAINT [fk_file_created_by];
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'fk_file_modified_by')
    ALTER TABLE [dbo].[file] DROP CONSTRAINT [fk_file_modified_by];

-- user_access_controlテーブル
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'fk_user_access_control_user_id')
    ALTER TABLE [dbo].[user_access_control] DROP CONSTRAINT [fk_user_access_control_user_id];
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'fk_user_access_control_profile_id')
    ALTER TABLE [dbo].[user_access_control] DROP CONSTRAINT [fk_user_access_control_profile_id];
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'fk_user_access_control_role_id')
    ALTER TABLE [dbo].[user_access_control] DROP CONSTRAINT [fk_user_access_control_role_id];
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'fk_user_access_control_created_by')
    ALTER TABLE [dbo].[user_access_control] DROP CONSTRAINT [fk_user_access_control_created_by];
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'fk_user_access_control_modified_by')
    ALTER TABLE [dbo].[user_access_control] DROP CONSTRAINT [fk_user_access_control_modified_by];

-- roleテーブル
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'fk_role_created_by')
    ALTER TABLE [dbo].[role] DROP CONSTRAINT [fk_role_created_by];
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'fk_role_modified_by')
    ALTER TABLE [dbo].[role] DROP CONSTRAINT [fk_role_modified_by];
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'fk_role_parent_id')
    ALTER TABLE [dbo].[role] DROP CONSTRAINT [fk_role_parent_id];

-- profileテーブル
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'fk_profile_created_by')
    ALTER TABLE [dbo].[profile] DROP CONSTRAINT [fk_profile_created_by];
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'fk_profile_modified_by')
    ALTER TABLE [dbo].[profile] DROP CONSTRAINT [fk_profile_modified_by];

-- entityテーブル
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'fk_entity_created_by')
    ALTER TABLE [dbo].[entity] DROP CONSTRAINT [fk_entity_created_by];
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'fk_entity_modified_by')
    ALTER TABLE [dbo].[entity] DROP CONSTRAINT [fk_entity_modified_by];

-- entity_itemテーブル
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'fk_entity_item_entity_id')
    ALTER TABLE [dbo].[entity_item] DROP CONSTRAINT [fk_entity_item_entity_id];
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'fk_entity_item_created_by')
    ALTER TABLE [dbo].[entity_item] DROP CONSTRAINT [fk_entity_item_created_by];
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'fk_entity_item_modified_by')
    ALTER TABLE [dbo].[entity_item] DROP CONSTRAINT [fk_entity_item_modified_by];

-- entity_item_optionテーブル
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'fk_entity_item_entity_item_id')
    ALTER TABLE [dbo].[entity_item_option] DROP CONSTRAINT [fk_entity_item_entity_item_id];
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'fk_entity_item_option_created_by')
    ALTER TABLE [dbo].[entity_item_option] DROP CONSTRAINT [fk_entity_item_option_created_by];
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'fk_entity_item_option_modified_by')
    ALTER TABLE [dbo].[entity_item_option] DROP CONSTRAINT [fk_entity_item_option_modified_by];

/* 3. 既存のテーブルを削除 */
-- published_auth_codeテーブル
DROP TABLE IF EXISTS [dbo].[published_auth_code];

-- fileテーブル
DROP TABLE IF EXISTS [dbo].[file];

-- sampleテーブル
DROP TABLE IF EXISTS [dbo].[sample];

-- opportunityテーブル
DROP TABLE IF EXISTS [dbo].[opportunity];

-- phone_callテーブル
DROP TABLE IF EXISTS [dbo].[phone_call];

-- activityテーブル
DROP TABLE IF EXISTS [dbo].[activity];

-- campaignテーブル
DROP TABLE IF EXISTS [dbo].[campaign];

-- productテーブル
DROP TABLE IF EXISTS [dbo].[product];

-- caseテーブル
DROP TABLE IF EXISTS [dbo].[case];

-- contactテーブル
DROP TABLE IF EXISTS [dbo].[contact];

-- accountテーブル
DROP TABLE IF EXISTS [dbo].[account];

-- leadテーブル
DROP TABLE IF EXISTS [dbo].[lead];

-- entity_item_optionテーブル
DROP TABLE IF EXISTS [dbo].[entity_item_option];

-- entity_itemテーブル
DROP TABLE IF EXISTS [dbo].[entity_item];

-- entityテーブル
DROP TABLE IF EXISTS [dbo].[entity];

-- user_access_controlテーブル
DROP TABLE IF EXISTS [dbo].[user_access_control];

-- roleテーブル
DROP TABLE IF EXISTS [dbo].[role];

-- profileテーブル
DROP TABLE IF EXISTS [dbo].[profile];

-- userテーブル
DROP TABLE IF EXISTS [dbo].[user];

-- oauth_clientテーブル
DROP TABLE IF EXISTS [dbo].[oauth_client];

-- jwk_private_keyテーブル
DROP TABLE IF EXISTS [dbo].[jwk_private_key];


/* 4. テーブルを再作成 */
-- jwk_private_keyテーブル
CREATE TABLE [dbo].[jwk_private_key]
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
CREATE TABLE [dbo].[oauth_client]
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
CREATE TABLE [dbo].[user] (
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
CREATE TABLE [dbo].[profile] (
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
    CONSTRAINT [fk_profile_created_by] FOREIGN KEY ([created_by]) REFERENCES [dbo].[user] ([id]),
    CONSTRAINT [fk_profile_modified_by] FOREIGN KEY ([modified_by]) REFERENCES [dbo].[user] ([id])
);

-- roleテーブル
CREATE TABLE [dbo].[role] (
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
    CONSTRAINT [fk_role_created_by] FOREIGN KEY ([created_by]) REFERENCES [dbo].[user] ([id]),
    CONSTRAINT [fk_role_modified_by] FOREIGN KEY ([modified_by]) REFERENCES [dbo].[user] ([id]),
    CONSTRAINT [fk_role_parent_id] FOREIGN KEY ([parent_id]) REFERENCES [dbo].[role] ([id])
);

-- user_access_controlテーブル
CREATE TABLE [dbo].[user_access_control] (
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
    CONSTRAINT [fk_user_access_control_user_id] FOREIGN KEY ([user_id]) REFERENCES [dbo].[user] ([id]),
    CONSTRAINT [fk_user_access_control_profile_id] FOREIGN KEY ([profile_id]) REFERENCES [dbo].[profile] ([id]),
    CONSTRAINT [fk_user_access_control_role_id] FOREIGN KEY ([role_id]) REFERENCES [dbo].[role] ([id]),
    CONSTRAINT [fk_user_access_control_created_by] FOREIGN KEY ([created_by]) REFERENCES [dbo].[user] ([id]),
    CONSTRAINT [fk_user_access_control_modified_by] FOREIGN KEY ([modified_by]) REFERENCES [dbo].[user] ([id])
);

-- entityテーブル
CREATE TABLE [dbo].[entity] (
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
    CONSTRAINT [fk_entity_created_by] FOREIGN KEY ([created_by]) REFERENCES [dbo].[user] ([id]),
    CONSTRAINT [fk_entity_modified_by] FOREIGN KEY ([modified_by]) REFERENCES [dbo].[user] ([id])
);

-- entity_itemテーブル
CREATE TABLE [dbo].[entity_item] (
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
    CONSTRAINT [fk_entity_item_entity_id] FOREIGN KEY ([entity_id]) REFERENCES [dbo].[entity] ([id]),
    CONSTRAINT [fk_entity_item_created_by] FOREIGN KEY ([created_by]) REFERENCES [dbo].[user] ([id]),
    CONSTRAINT [fk_entity_item_modified_by] FOREIGN KEY ([modified_by]) REFERENCES [dbo].[user] ([id])
);

-- entity_item_optionテーブル
CREATE TABLE [dbo].[entity_item_option] (
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
    CONSTRAINT [fk_entity_item_option_entity_item_id] FOREIGN KEY ([entity_item_id]) REFERENCES [dbo].[entity_item] ([id]),
    CONSTRAINT [fk_entity_item_option_created_by] FOREIGN KEY ([created_by]) REFERENCES [dbo].[user] ([id]),
    CONSTRAINT [fk_entity_item_option_modified_by] FOREIGN KEY ([modified_by]) REFERENCES [dbo].[user] ([id])
);

-- leadテーブル
CREATE TABLE [dbo].[lead] (
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
CREATE TABLE [dbo].[account] (
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
CREATE TABLE [dbo].[contact] (
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
CREATE TABLE [dbo].[case] (
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
CREATE TABLE [dbo].[product] (
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
CREATE TABLE [dbo].[campaign] (
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
CREATE TABLE [dbo].[activity] (
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
CREATE TABLE [dbo].[phone_call] (
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
CREATE TABLE [dbo].[opportunity] (
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
CREATE TABLE [dbo].[sample] (
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
CREATE TABLE [dbo].[file] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [df_file_id] DEFAULT newid(),
    [name] NVARCHAR(255) NOT NULL,
    [type] NVARCHAR(20) NOT NULL,
    [content] VARBINARY(max) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [df_file_created_at] DEFAULT getutcdate(),
    [created_by] UNIQUEIDENTIFIER NOT NULL,
    [modified_at] DATETIME2 NOT NULL CONSTRAINT [df_file_modified_at] DEFAULT getutcdate(),
    [modified_by] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [pk_file] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [fk_file_created_by] FOREIGN KEY ([created_by]) REFERENCES [dbo].[user] ([id]),
    CONSTRAINT [fk_file_modified_by] FOREIGN KEY ([modified_by]) REFERENCES [dbo].[user] ([id])
);

-- published_auth_codeテーブル
CREATE TABLE [dbo].[published_auth_code]
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
  CONSTRAINT[fk_published_auth_code_user_id] FOREIGN KEY([user_id]) REFERENCES [user]([id]),
);

/* 5. 一時テーブルからデータを復元 */
-- jwk_private_keyテーブル
INSERT INTO [dbo].[jwk_private_key] (
    [id], [encrypted_private_key_pem], [base64_iv], [validate_at],
    [expire_at], [closed_at], [created_at]
)
SELECT
    [id], [encrypted_private_key_pem], [base64_iv], [validate_at],
    [expire_at], [closed_at], [created_at]
FROM [dbo].[jwk_private_key_temp];

-- oauth_clientテーブル
INSERT INTO [dbo].[oauth_client] (
    [id], [name], [secret], [redirect_uris], [scopes],
    [created_at], [modified_at]
)
SELECT
    [id], [name], [secret], [redirect_uris], [scopes],
    [created_at], [modified_at]
FROM [dbo].[oauth_client_temp];

-- userテーブル
INSERT INTO [dbo].[user] (
    [id], [user_name], [hashed_password], [first_name], [last_name],
    [email], [timezone], [locale], [is_active], [created_at], [modified_at]
)
SELECT
    [id], [user_name], [hashed_password], [first_name], [last_name],
    [email], [timezone], [locale], [is_active], [created_at], [modified_at]
FROM [dbo].[user_temp];

-- profileテーブル
INSERT INTO [dbo].[profile] (
    [id], [name], [display_name], [order], [created_at], [created_by], 
    [modified_at], [modified_by]
)
SELECT
    [id], [name], [display_name], [order], [created_at], [created_by],
    [modified_at], [modified_by]
FROM [dbo].[profile_temp];

-- roleテーブル
INSERT INTO [dbo].[role] (
    [id], [name], [display_name], [order], [parent_id], [created_at], 
    [created_by], [modified_at], [modified_by]
)
SELECT
    [id], [name], [display_name], [order], [parent_id], [created_at],
    [created_by], [modified_at], [modified_by]
FROM [dbo].[role_temp];

-- user_access_controlテーブル
INSERT INTO [dbo].[user_access_control] (
    [id], [user_id], [profile_id], [role_id], [created_at], [created_by],
    [modified_at], [modified_by]
)
SELECT
    [id], [user_id], [profile_id], [role_id], [created_at], [created_by],
    [modified_at], [modified_by]
FROM [dbo].[user_access_control_temp];

-- entityテーブル
INSERT INTO [dbo].[entity] (
    [id], [name], [display_name], [order], [title_field_name], [created_at],
    [created_by], [modified_at], [modified_by]
)
SELECT
    [id], [name], [display_name], [order], [title_field_name], [created_at],
    [created_by], [modified_at], [modified_by]
FROM [dbo].[entity_temp];

-- entity_itemテーブル
INSERT INTO [dbo].[entity_item] (
    [id], [entity_id], [name], [display_name], [order], [type], [sub_type],
    [is_required], [is_filterable], [is_creatable], [is_updatable], [is_formula],
    [max_length], [precision], [scale], [reference_entities], [created_at],
    [created_by], [modified_at], [modified_by]
)
SELECT
    [id], [entity_id], [name], [display_name], [order], [type], [sub_type],
    [is_required], [is_filterable], [is_creatable], [is_updatable], [is_formula],
    [max_length], [precision], [scale], [reference_entities], [created_at],
    [created_by], [modified_at], [modified_by]
FROM [dbo].[entity_item_temp];

-- entity_item_optionテーブル
INSERT INTO [dbo].[entity_item_option] (
    [id], [entity_item_id], [name], [display_name], [order], [is_default],
    [created_at], [created_by], [modified_at], [modified_by]
)
SELECT
    [id], [entity_item_id], [name], [display_name], [order], [is_default],
    [created_at], [created_by], [modified_at], [modified_by]
FROM [dbo].[entity_item_option_temp];

-- leadテーブル
INSERT INTO [dbo].[lead] (
    [id], [company], [first_name], [last_name], [business_unit], [title],
    [address_zipcode], [address_prefecture], [address_municipality], [address_street],
    [latitude], [longitude], [phone_number], [email], [website], [description],
    [lead_source], [status], [industry], [rating], [annual_revenue], [number_of_employees],
    [is_converted], [converted_date], [is_deleted], [owner], [created_at], [created_by],
    [modified_at], [modified_by]
)
SELECT
    [id], [company], [first_name], [last_name], [business_unit], [title],
    [address_zipcode], [address_prefecture], [address_municipality], [address_street],
    [latitude], [longitude], [phone_number], [email], [website], [description],
    [lead_source], [status], [industry], [rating], [annual_revenue], [number_of_employees],
    [is_converted], [converted_date], [is_deleted], [owner], [created_at], [created_by],
    [modified_at], [modified_by]
FROM [dbo].[lead_temp];

-- accountテーブル
INSERT INTO [dbo].[account] (
    [id], [name], [account_number], [main_phone_number], [sub_phone_number], [website],
    [industry], [number_of_employees], [revenue], [address_zipcode], [address_prefecture],
    [address_municipality], [address_street], [latitude], [longitude], [market_cap],
    [description], [originating_lead], [parent], [is_deleted], [owner], [created_at],
    [created_by], [modified_at], [modified_by]
)
SELECT
    [id], [name], [account_number], [main_phone_number], [sub_phone_number], [website],
    [industry], [number_of_employees], [revenue], [address_zipcode], [address_prefecture],
    [address_municipality], [address_street], [latitude], [longitude], [market_cap],
    [description], [originating_lead], [parent], [is_deleted], [owner], [created_at],
    [created_by], [modified_at], [modified_by]
FROM [dbo].[account_temp];

-- contactテーブル
INSERT INTO [dbo].[contact] (
    [id], [first_name], [last_name], [gender], [account], [business_unit], [title],
    [company_phone_number], [mobile_phone_number], [email], [website], [originating_lead],
    [description], [is_deleted], [owner], [created_at], [created_by], [modified_at], [modified_by]
)
SELECT
    [id], [first_name], [last_name], [gender], [account], [business_unit], [title],
    [company_phone_number], [mobile_phone_number], [email], [website], [originating_lead],
    [description], [is_deleted], [owner], [created_at], [created_by], [modified_at], [modified_by]
FROM [dbo].[contact_temp];

-- caseテーブル
INSERT INTO [dbo].[case] (
    [id], [case_number], [subject], [detail], [contact], [account], [parent], [type],
    [status], [reason], [origin], [priority], [is_escalated], [closed_datetime],
    [description], [is_deleted], [owner], [created_at], [created_by], [modified_at], [modified_by]
)
SELECT
    [id], [case_number], [subject], [detail], [contact], [account], [parent], [type],
    [status], [reason], [origin], [priority], [is_escalated], [closed_datetime],
    [description], [is_deleted], [owner], [created_at], [created_by], [modified_at], [modified_by]
FROM [dbo].[case_temp];

-- productテーブル
INSERT INTO [dbo].[product] (
    [id], [name], [product], [description], [is_active], [family], [external_id], [url],
    [quantity_unit], [is_archived], [is_deleted], [owner], [created_at], [created_by],
    [modified_at], [modified_by]
)
SELECT
    [id], [name], [product], [description], [is_active], [family], [external_id], [url],
    [quantity_unit], [is_archived], [is_deleted], [owner], [created_at], [created_by],
    [modified_at], [modified_by]
FROM [dbo].[product_temp];

-- campaignテーブル
INSERT INTO [dbo].[campaign] (
    [id], [name], [code], [type], [start_date], [end_date], [description],
    [expected_response], [budgeted_cost], [expected_revenue], [status], [is_deleted],
    [owner], [created_at], [created_by], [modified_at], [modified_by]
)
SELECT
    [id], [name], [code], [type], [start_date], [end_date], [description],
    [expected_response], [budgeted_cost], [expected_revenue], [status], [is_deleted],
    [owner], [created_at], [created_by], [modified_at], [modified_by]
FROM [dbo].[campaign_temp];

-- activityテーブル
INSERT INTO [dbo].[activity] (
    [id], [subject], [target], [start_date_time], [end_date_time], [is_all_day_event],
    [status], [location], [required_attendees], [optional_attendees], [organizer],
    [meeting_url], [description], [is_archived], [is_deleted], [owner], [created_at],
    [created_by], [modified_at], [modified_by]
)
SELECT
    [id], [subject], [target], [start_date_time], [end_date_time], [is_all_day_event],
    [status], [location], [required_attendees], [optional_attendees], [organizer],
    [meeting_url], [description], [is_archived], [is_deleted], [owner], [created_at],
    [created_by], [modified_at], [modified_by]
FROM [dbo].[activity_temp];

-- phone_callテーブル
INSERT INTO [dbo].[phone_call] (
    [id], [subject], [user], [their], [phone_number], [direction], [start_date_time],
    [end_date_time], [status], [description], [is_deleted], [owner], [created_at],
    [created_by], [modified_at], [modified_by]
)
SELECT
    [id], [subject], [user], [their], [phone_number], [direction], [start_date_time],
    [end_date_time], [status], [description], [is_deleted], [owner], [created_at],
    [created_by], [modified_at], [modified_by]
FROM [dbo].[phone_call_temp];

-- opportunityテーブル
INSERT INTO [dbo].[opportunity] (
    [id], [name], [account], [phase], [amount], [probability], [close_date], [type],
    [next_step], [lead_source], [campaign], [contact], [is_closed], [description],
    [is_deleted], [owner], [created_at], [created_by], [modified_at], [modified_by]
)
SELECT
    [id], [name], [account], [phase], [amount], [probability], [close_date], [type],
    [next_step], [lead_source], [campaign], [contact], [is_closed], [description],
    [is_deleted], [owner], [created_at], [created_by], [modified_at], [modified_by]
FROM [dbo].[opportunity_temp];

-- sampleテーブル
INSERT INTO [dbo].[sample] (
    [id], [name], [text], [textarea], [phone_number], [email], [url], [combobox],
    [integer], [decimal], [boolean], [date], [datetime], [time], [option_single],
    [option_multi], [reference_single_target_single_id], [reference_single_target_multi_id],
    [reference_multi_target_single_id], [reference_multi_target_multi_id], [is_deleted],
    [owner], [created_at], [created_by], [modified_at], [modified_by]
)
SELECT
    [id], [name], [text], [textarea], [phone_number], [email], [url], [combobox],
    [integer], [decimal], [boolean], [date], [datetime], [time], [option_single],
    [option_multi], [reference_single_target_single_id], [reference_single_target_multi_id],
    [reference_multi_target_single_id], [reference_multi_target_multi_id], [is_deleted],
    [owner], [created_at], [created_by], [modified_at], [modified_by]
FROM [dbo].[sample_temp];

-- fileテーブル
INSERT INTO [dbo].[file] (
    [id], [name], [type], [content], [created_at], [created_by], [modified_at], [modified_by]
)
SELECT
    [id], [name], [type], [content], [created_at], [created_by], [modified_at], [modified_by]
FROM [dbo].[file_temp];

-- published_auth_codeテーブル
INSERT INTO [dbo].[published_auth_code] (
    [auth_code], [client_id], [client_secret], [redirect_uri], [scope],
    [state], [nonce], [code_challenge], [code_challenge_method], [published_at],
    [expire_at], [user_id]
)
SELECT
    [auth_code], [client_id], [client_secret], [redirect_uri], [scope],
    [state], [nonce], [code_challenge], [code_challenge_method], [published_at],
    [expire_at], [user_id]
FROM [dbo].[published_auth_code_temp];

/* 6. 一時テーブルを削除 */
-- jwk_private_keyテーブル
DROP TABLE IF EXISTS [dbo].[jwk_private_key_temp];

-- oauth_clientテーブル
DROP TABLE IF EXISTS [dbo].[oauth_client_temp];

-- userテーブル
DROP TABLE IF EXISTS [dbo].[user_temp];

-- profileテーブル
DROP TABLE IF EXISTS [dbo].[profile_temp];

-- roleテーブル
DROP TABLE IF EXISTS [dbo].[role_temp];

-- user_access_controlテーブル
DROP TABLE IF EXISTS [dbo].[user_access_control_temp];

-- entityテーブル
DROP TABLE IF EXISTS [dbo].[entity_temp];

-- entity_itemテーブル
DROP TABLE IF EXISTS [dbo].[entity_item_temp];

-- entity_item_optionテーブル
DROP TABLE IF EXISTS [dbo].[entity_item_option_temp];

-- leadテーブル
DROP TABLE IF EXISTS [dbo].[lead_temp];

-- accountテーブル
DROP TABLE IF EXISTS [dbo].[account_temp];

-- contactテーブル
DROP TABLE IF EXISTS [dbo].[contact_temp];

-- caseテーブル
DROP TABLE IF EXISTS [dbo].[case_temp];

-- productテーブル
DROP TABLE IF EXISTS [dbo].[product_temp];

-- campaignテーブル
DROP TABLE IF EXISTS [dbo].[campaign_temp];

-- activityテーブル
DROP TABLE IF EXISTS [dbo].[activity_temp];

-- phone_callテーブル
DROP TABLE IF EXISTS [dbo].[phone_call_temp];

-- opportunityテーブル
DROP TABLE IF EXISTS [dbo].[opportunity_temp];

-- sampleテーブル
DROP TABLE IF EXISTS [dbo].[sample_temp];

-- fileテーブル
DROP TABLE IF EXISTS [dbo].[file_temp];

-- published_auth_codeテーブル
DROP TABLE IF EXISTS [dbo].[published_auth_code_temp];

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
  ROLLBACK TRAN;
END;
THROW

END CATCH
