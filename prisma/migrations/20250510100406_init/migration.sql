BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[account] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF__account__id__54EEBDFC] DEFAULT newid(),
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
    [is_deleted] BIT NOT NULL CONSTRAINT [DF__account__is_dele__55E2E235] DEFAULT 0,
    [owner] NVARCHAR(max) NOT NULL,
    [created_at] DATETIME NOT NULL CONSTRAINT [DF__account__created__56D7066E] DEFAULT getutcdate(),
    [created_by] NVARCHAR(max) NOT NULL,
    [modified_at] DATETIME NOT NULL CONSTRAINT [DF__account__modifie__57CB2AA7] DEFAULT getutcdate(),
    [modified_by] NVARCHAR(max) NOT NULL,
    CONSTRAINT [pk_account] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[activity] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF__activity__id__74676955] DEFAULT newid(),
    [subject] NVARCHAR(256),
    [target] NVARCHAR(256),
    [start_date_time] DATETIME,
    [end_date_time] DATETIME,
    [is_all_day_event] BIT NOT NULL CONSTRAINT [DF__activity__is_all__755B8D8E] DEFAULT 0,
    [status] NVARCHAR(max),
    [location] NVARCHAR(256),
    [required_attendees] NVARCHAR(max),
    [optional_attendees] NVARCHAR(max),
    [organizer] NVARCHAR(max),
    [meeting_url] NVARCHAR(max),
    [description] NVARCHAR(max),
    [is_archived] BIT NOT NULL CONSTRAINT [DF__activity__is_arc__764FB1C7] DEFAULT 0,
    [is_deleted] BIT NOT NULL CONSTRAINT [DF__activity__is_del__7743D600] DEFAULT 0,
    [owner] NVARCHAR(max) NOT NULL,
    [created_at] DATETIME NOT NULL CONSTRAINT [DF__activity__create__7837FA39] DEFAULT getutcdate(),
    [created_by] NVARCHAR(max) NOT NULL,
    [modified_at] DATETIME NOT NULL CONSTRAINT [DF__activity__modifi__792C1E72] DEFAULT getutcdate(),
    [modified_by] NVARCHAR(max) NOT NULL,
    CONSTRAINT [pk_activity] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[campaign] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF__campaign__id__6EAE8FFF] DEFAULT newid(),
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
    [is_deleted] BIT NOT NULL CONSTRAINT [DF__campaign__is_del__6FA2B438] DEFAULT 0,
    [owner] NVARCHAR(max) NOT NULL,
    [created_at] DATETIME NOT NULL CONSTRAINT [DF__campaign__create__7096D871] DEFAULT getutcdate(),
    [created_by] NVARCHAR(max) NOT NULL,
    [modified_at] DATETIME NOT NULL CONSTRAINT [DF__campaign__modifi__718AFCAA] DEFAULT getutcdate(),
    [modified_by] NVARCHAR(max) NOT NULL,
    CONSTRAINT [pk_campaign] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[case] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF__case__id__606070A8] DEFAULT newid(),
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
    [is_escalated] BIT NOT NULL CONSTRAINT [DF__case__is_escalat__615494E1] DEFAULT 0,
    [closed_datetime] DATETIME,
    [description] NVARCHAR(max),
    [is_deleted] BIT NOT NULL CONSTRAINT [DF__case__is_deleted__6248B91A] DEFAULT 0,
    [owner] NVARCHAR(max) NOT NULL,
    [created_at] DATETIME NOT NULL CONSTRAINT [DF__case__created_at__633CDD53] DEFAULT getutcdate(),
    [created_by] NVARCHAR(max) NOT NULL,
    [modified_at] DATETIME NOT NULL CONSTRAINT [DF__case__modified_a__6431018C] DEFAULT getutcdate(),
    [modified_by] NVARCHAR(max) NOT NULL,
    CONSTRAINT [pk_case] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[contact] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF__contact__id__5AA79752] DEFAULT newid(),
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
    [is_deleted] BIT NOT NULL CONSTRAINT [DF__contact__is_dele__5B9BBB8B] DEFAULT 0,
    [owner] NVARCHAR(max) NOT NULL,
    [created_at] DATETIME NOT NULL CONSTRAINT [DF__contact__created__5C8FDFC4] DEFAULT getutcdate(),
    [created_by] NVARCHAR(max) NOT NULL,
    [modified_at] DATETIME NOT NULL CONSTRAINT [DF__contact__modifie__5D8403FD] DEFAULT getutcdate(),
    [modified_by] NVARCHAR(max) NOT NULL,
    CONSTRAINT [pk_contact] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[entity] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF__entity__id__2BECA869] DEFAULT newid(),
    [name] NVARCHAR(255) NOT NULL,
    [display_name] NVARCHAR(255) NOT NULL,
    [order] SMALLINT NOT NULL CONSTRAINT [DF__entity__order__2CE0CCA2] DEFAULT 0,
    [created_at] DATETIME NOT NULL CONSTRAINT [DF__entity__created___2DD4F0DB] DEFAULT getutcdate(),
    [created_by] UNIQUEIDENTIFIER NOT NULL,
    [modified_at] DATETIME NOT NULL CONSTRAINT [DF__entity__modified__2EC91514] DEFAULT getutcdate(),
    [modified_by] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [pk_entity] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [uk_entity_1] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[entity_item] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF__entity_item__id__3481EE6A] DEFAULT newid(),
    [entity_id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [display_name] NVARCHAR(255) NOT NULL,
    [order] SMALLINT NOT NULL CONSTRAINT [DF__entity_it__order__357612A3] DEFAULT 0,
    [type] NVARCHAR(20) NOT NULL,
    [sub_type] NVARCHAR(20),
    [is_required] BIT NOT NULL CONSTRAINT [DF__entity_it__is_re__366A36DC] DEFAULT 0,
    [is_filterable] BIT NOT NULL CONSTRAINT [DF__entity_it__is_fi__375E5B15] DEFAULT 0,
    [is_creatable] BIT NOT NULL CONSTRAINT [DF__entity_it__is_cr__38527F4E] DEFAULT 0,
    [is_updatable] BIT NOT NULL CONSTRAINT [DF__entity_it__is_up__3946A387] DEFAULT 0,
    [is_formula] BIT NOT NULL CONSTRAINT [DF__entity_it__is_fo__3A3AC7C0] DEFAULT 0,
    [max_length] SMALLINT,
    [precision] SMALLINT,
    [scale] SMALLINT,
    [reference_entities] NVARCHAR(max),
    [created_at] DATETIME NOT NULL CONSTRAINT [DF__entity_it__creat__3B2EEBF9] DEFAULT getutcdate(),
    [created_by] UNIQUEIDENTIFIER NOT NULL,
    [modified_at] DATETIME NOT NULL CONSTRAINT [DF__entity_it__modif__3C231032] DEFAULT getutcdate(),
    [modified_by] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [pk_entity_item] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [uk_entity_item_1] UNIQUE NONCLUSTERED ([entity_id],[name])
);

-- CreateTable
CREATE TABLE [dbo].[entity_item_option] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF__entity_item___id__44B85633] DEFAULT newid(),
    [entity_item_id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [display_name] NVARCHAR(255) NOT NULL,
    [order] SMALLINT NOT NULL CONSTRAINT [DF__entity_it__order__45AC7A6C] DEFAULT 0,
    [is_default] BIT NOT NULL CONSTRAINT [DF__entity_it__is_de__46A09EA5] DEFAULT 0,
    [created_at] DATETIME NOT NULL CONSTRAINT [DF__entity_it__creat__4794C2DE] DEFAULT getutcdate(),
    [created_by] UNIQUEIDENTIFIER NOT NULL,
    [modified_at] DATETIME NOT NULL CONSTRAINT [DF__entity_it__modif__4888E717] DEFAULT getutcdate(),
    [modified_by] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [pk_entity_item_option] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [uk_entity_item_option_1] UNIQUE NONCLUSTERED ([entity_item_id],[name])
);

-- CreateTable
CREATE TABLE [dbo].[lead] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF__lead__id__4E41C06D] DEFAULT newid(),
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
    [is_converted] BIT CONSTRAINT [DF__lead__is_convert__4F35E4A6] DEFAULT 0,
    [converted_date] DATE,
    [is_deleted] BIT NOT NULL CONSTRAINT [DF__lead__is_deleted__502A08DF] DEFAULT 0,
    [owner] NVARCHAR(max) NOT NULL,
    [created_at] DATETIME NOT NULL CONSTRAINT [DF__lead__created_at__511E2D18] DEFAULT getutcdate(),
    [created_by] NVARCHAR(max) NOT NULL,
    [modified_at] DATETIME NOT NULL CONSTRAINT [DF__lead__modified_a__52125151] DEFAULT getutcdate(),
    [modified_by] NVARCHAR(max) NOT NULL,
    CONSTRAINT [pk_lead] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[opportunity] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF__opportunity__id__01C16473] DEFAULT newid(),
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
    [is_closed] BIT NOT NULL CONSTRAINT [DF__opportuni__is_cl__02B588AC] DEFAULT 0,
    [description] NVARCHAR(max),
    [is_deleted] BIT NOT NULL CONSTRAINT [DF__opportuni__is_de__03A9ACE5] DEFAULT 0,
    [owner] NVARCHAR(max) NOT NULL,
    [created_at] DATETIME NOT NULL CONSTRAINT [DF__opportuni__creat__049DD11E] DEFAULT getutcdate(),
    [created_by] NVARCHAR(max) NOT NULL,
    [modified_at] DATETIME NOT NULL CONSTRAINT [DF__opportuni__modif__0591F557] DEFAULT getutcdate(),
    [modified_by] NVARCHAR(max) NOT NULL,
    CONSTRAINT [pk_opportunity] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[phone_call] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF__phone_call__id__7C088B1D] DEFAULT newid(),
    [subject] NVARCHAR(256) NOT NULL,
    [user] NVARCHAR(max) NOT NULL,
    [their] NVARCHAR(max) NOT NULL,
    [phone_number] NVARCHAR(50),
    [direction] NVARCHAR(max) NOT NULL,
    [start_date_time] DATETIME,
    [end_date_time] DATETIME,
    [status] NVARCHAR(max),
    [description] NVARCHAR(max),
    [is_deleted] BIT NOT NULL CONSTRAINT [DF__phone_cal__is_de__7CFCAF56] DEFAULT 0,
    [owner] NVARCHAR(max) NOT NULL,
    [created_at] DATETIME NOT NULL CONSTRAINT [DF__phone_cal__creat__7DF0D38F] DEFAULT getutcdate(),
    [created_by] NVARCHAR(max) NOT NULL,
    [modified_at] DATETIME NOT NULL CONSTRAINT [DF__phone_cal__modif__7EE4F7C8] DEFAULT getutcdate(),
    [modified_by] NVARCHAR(max) NOT NULL,
    CONSTRAINT [pk_phone_call] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[product] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF__product__id__670D6E37] DEFAULT newid(),
    [name] NVARCHAR(256) NOT NULL,
    [product] NVARCHAR(256),
    [description] NVARCHAR(max),
    [is_active] BIT NOT NULL CONSTRAINT [DF__product__is_acti__68019270] DEFAULT 0,
    [family] NVARCHAR(max),
    [external_id] NVARCHAR(256),
    [url] NVARCHAR(max),
    [quantity_unit] NVARCHAR(max),
    [is_archived] BIT NOT NULL CONSTRAINT [DF__product__is_arch__68F5B6A9] DEFAULT 0,
    [is_deleted] BIT NOT NULL CONSTRAINT [DF__product__is_dele__69E9DAE2] DEFAULT 0,
    [owner] NVARCHAR(max) NOT NULL,
    [created_at] DATETIME NOT NULL CONSTRAINT [DF__product__created__6ADDFF1B] DEFAULT getutcdate(),
    [created_by] NVARCHAR(max) NOT NULL,
    [modified_at] DATETIME NOT NULL CONSTRAINT [DF__product__modifie__6BD22354] DEFAULT getutcdate(),
    [modified_by] NVARCHAR(max) NOT NULL,
    CONSTRAINT [pk_product] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[profile] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF__profile__id__0F5069BB] DEFAULT newid(),
    [name] NVARCHAR(256) NOT NULL,
    [display_name] NVARCHAR(256) NOT NULL,
    [order] SMALLINT NOT NULL CONSTRAINT [DF__profile__order__10448DF4] DEFAULT 0,
    [created_at] DATETIME NOT NULL CONSTRAINT [DF__profile__created__1138B22D] DEFAULT getutcdate(),
    [created_by] UNIQUEIDENTIFIER NOT NULL,
    [modified_at] DATETIME NOT NULL CONSTRAINT [DF__profile__modifie__122CD666] DEFAULT getutcdate(),
    [modified_by] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [pk_profile] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [uk_profile_1] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[role] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF__role__id__17E5AFBC] DEFAULT newid(),
    [name] NVARCHAR(256) NOT NULL,
    [display_name] NVARCHAR(256) NOT NULL,
    [order] SMALLINT NOT NULL CONSTRAINT [DF__role__order__18D9D3F5] DEFAULT 0,
    [parent_id] UNIQUEIDENTIFIER,
    [created_at] DATETIME NOT NULL CONSTRAINT [DF__role__created_at__19CDF82E] DEFAULT getutcdate(),
    [created_by] UNIQUEIDENTIFIER NOT NULL,
    [modified_at] DATETIME NOT NULL CONSTRAINT [DF__role__modified_a__1AC21C67] DEFAULT getutcdate(),
    [modified_by] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [pk_role] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [uk_role_1] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[user] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF__user__id__08A36C2C] DEFAULT newid(),
    [user_name] NVARCHAR(256) NOT NULL,
    [first_name] NVARCHAR(256) NOT NULL,
    [last_name] NVARCHAR(256) NOT NULL,
    [email] NVARCHAR(max),
    [timezone] NVARCHAR(max),
    [language] NVARCHAR(max),
    [is_active] BIT NOT NULL CONSTRAINT [DF__user__is_active__09979065] DEFAULT 0,
    [created_at] DATETIME NOT NULL CONSTRAINT [DF__user__created_at__0A8BB49E] DEFAULT getutcdate(),
    [modified_at] DATETIME NOT NULL CONSTRAINT [DF__user__modified_a__0B7FD8D7] DEFAULT getutcdate(),
    CONSTRAINT [pk_user] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [uk_user_1] UNIQUE NONCLUSTERED ([user_name])
);

-- CreateTable
CREATE TABLE [dbo].[user_access_control] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF__user_access___id__216F19F6] DEFAULT newid(),
    [user_id] UNIQUEIDENTIFIER NOT NULL,
    [profile_id] UNIQUEIDENTIFIER NOT NULL,
    [role_id] UNIQUEIDENTIFIER,
    [created_at] DATETIME NOT NULL CONSTRAINT [DF__user_acce__creat__22633E2F] DEFAULT getutcdate(),
    [created_by] UNIQUEIDENTIFIER NOT NULL,
    [modified_at] DATETIME NOT NULL CONSTRAINT [DF__user_acce__modif__23576268] DEFAULT getutcdate(),
    [modified_by] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [pk_user_access_control] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [uk_user_access_control_1] UNIQUE NONCLUSTERED ([user_id])
);

-- CreateTable
CREATE TABLE [dbo].[sample] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF__sample__id__7AAA5290] DEFAULT newid(),
    [name] NVARCHAR(256) NOT NULL,
    [text] NVARCHAR(max),
    [textarea] NVARCHAR(max),
    [phone_number] NVARCHAR(50),
    [email] NVARCHAR(max),
    [url] NVARCHAR(max),
    [combobox] NVARCHAR(max),
    [integer] DECIMAL(16,0),
    [decimal] DECIMAL(16,2),
    [boolean] BIT CONSTRAINT [DF__sample__boolean__7B9E76C9] DEFAULT 0,
    [date] DATE,
    [datetime] DATETIME,
    [time] TIME,
    [option_single] NVARCHAR(max),
    [option_multi] NVARCHAR(max),
    [reference_single_target_single_id] NVARCHAR(max),
    [reference_single_target_multi_id] NVARCHAR(max),
    [reference_multi_target_single_id] NVARCHAR(max),
    [reference_multi_target_multi_id] NVARCHAR(max),
    [is_deleted] BIT NOT NULL CONSTRAINT [DF__sample__is_delet__7C929B02] DEFAULT 0,
    [owner] NVARCHAR(max) NOT NULL,
    [created_at] DATETIME NOT NULL CONSTRAINT [DF__sample__created___7D86BF3B] DEFAULT getutcdate(),
    [created_by] NVARCHAR(max) NOT NULL,
    [modified_at] DATETIME NOT NULL CONSTRAINT [DF__sample__modified__7E7AE374] DEFAULT getutcdate(),
    [modified_by] NVARCHAR(max) NOT NULL,
    CONSTRAINT [pk_sample] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[file] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF__file__id__3FC983E4] DEFAULT newid(),
    [name] NVARCHAR(255) NOT NULL,
    [type] NVARCHAR(20) NOT NULL,
    [content] VARBINARY(max) NOT NULL,
    [created_at] DATETIME NOT NULL CONSTRAINT [DF__file__created_at__40BDA81D] DEFAULT getutcdate(),
    [created_by] UNIQUEIDENTIFIER NOT NULL,
    [modified_at] DATETIME NOT NULL CONSTRAINT [DF__file__modified_a__41B1CC56] DEFAULT getutcdate(),
    [modified_by] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [pk_file] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[entity] ADD CONSTRAINT [fk_entity_created_by] FOREIGN KEY ([created_by]) REFERENCES [dbo].[user]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[entity] ADD CONSTRAINT [fk_entity_modified_by] FOREIGN KEY ([modified_by]) REFERENCES [dbo].[user]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[entity_item] ADD CONSTRAINT [fk_entity_item_created_by] FOREIGN KEY ([created_by]) REFERENCES [dbo].[user]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[entity_item] ADD CONSTRAINT [fk_entity_item_entity_id] FOREIGN KEY ([entity_id]) REFERENCES [dbo].[entity]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[entity_item] ADD CONSTRAINT [fk_entity_item_modified_by] FOREIGN KEY ([modified_by]) REFERENCES [dbo].[user]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[entity_item_option] ADD CONSTRAINT [fk_entity_item_entity_item_id] FOREIGN KEY ([entity_item_id]) REFERENCES [dbo].[entity_item]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[entity_item_option] ADD CONSTRAINT [fk_entity_item_option_created_by] FOREIGN KEY ([created_by]) REFERENCES [dbo].[user]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[entity_item_option] ADD CONSTRAINT [fk_entity_item_option_modified_by] FOREIGN KEY ([modified_by]) REFERENCES [dbo].[user]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[profile] ADD CONSTRAINT [fk_profile_created_by] FOREIGN KEY ([created_by]) REFERENCES [dbo].[user]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[profile] ADD CONSTRAINT [fk_profile_modified_by] FOREIGN KEY ([modified_by]) REFERENCES [dbo].[user]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[role] ADD CONSTRAINT [fk_role_created_by] FOREIGN KEY ([created_by]) REFERENCES [dbo].[user]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[role] ADD CONSTRAINT [fk_role_modified_by] FOREIGN KEY ([modified_by]) REFERENCES [dbo].[user]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[role] ADD CONSTRAINT [fk_role_parent_id] FOREIGN KEY ([parent_id]) REFERENCES [dbo].[role]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[user_access_control] ADD CONSTRAINT [fk_user_access_control_created_by] FOREIGN KEY ([created_by]) REFERENCES [dbo].[user]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[user_access_control] ADD CONSTRAINT [fk_user_access_control_modified_by] FOREIGN KEY ([modified_by]) REFERENCES [dbo].[user]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[user_access_control] ADD CONSTRAINT [fk_user_access_control_profile_id] FOREIGN KEY ([profile_id]) REFERENCES [dbo].[profile]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[user_access_control] ADD CONSTRAINT [fk_user_access_control_role_id] FOREIGN KEY ([role_id]) REFERENCES [dbo].[role]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[user_access_control] ADD CONSTRAINT [fk_user_access_control_user_id] FOREIGN KEY ([user_id]) REFERENCES [dbo].[user]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[file] ADD CONSTRAINT [fk_file_created_by] FOREIGN KEY ([created_by]) REFERENCES [dbo].[user]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[file] ADD CONSTRAINT [fk_file_modified_by] FOREIGN KEY ([modified_by]) REFERENCES [dbo].[user]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
