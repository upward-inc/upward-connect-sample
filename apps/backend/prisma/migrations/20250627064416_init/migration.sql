BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[account] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF__account__id__1C722D53] DEFAULT newid(),
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
    [is_deleted] BIT NOT NULL CONSTRAINT [DF__account__is_dele__1D66518C] DEFAULT 0,
    [owner] NVARCHAR(max) NOT NULL,
    [created_at] DATETIME NOT NULL CONSTRAINT [DF__account__created__1E5A75C5] DEFAULT getutcdate(),
    [created_by] NVARCHAR(max) NOT NULL,
    [modified_at] DATETIME NOT NULL CONSTRAINT [DF__account__modifie__1F4E99FE] DEFAULT getutcdate(),
    [modified_by] NVARCHAR(max) NOT NULL,
    CONSTRAINT [pk_account] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[activity] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF__activity__id__3BEAD8AC] DEFAULT newid(),
    [subject] NVARCHAR(256),
    [target] NVARCHAR(256),
    [start_date_time] DATETIME,
    [end_date_time] DATETIME,
    [is_all_day_event] BIT NOT NULL CONSTRAINT [DF__activity__is_all__3CDEFCE5] DEFAULT 0,
    [status] NVARCHAR(max),
    [location] NVARCHAR(256),
    [required_attendees] NVARCHAR(max),
    [optional_attendees] NVARCHAR(max),
    [organizer] NVARCHAR(max),
    [meeting_url] NVARCHAR(max),
    [description] NVARCHAR(max),
    [is_archived] BIT NOT NULL CONSTRAINT [DF__activity__is_arc__3DD3211E] DEFAULT 0,
    [is_deleted] BIT NOT NULL CONSTRAINT [DF__activity__is_del__3EC74557] DEFAULT 0,
    [owner] NVARCHAR(max) NOT NULL,
    [created_at] DATETIME NOT NULL CONSTRAINT [DF__activity__create__3FBB6990] DEFAULT getutcdate(),
    [created_by] NVARCHAR(max) NOT NULL,
    [modified_at] DATETIME NOT NULL CONSTRAINT [DF__activity__modifi__40AF8DC9] DEFAULT getutcdate(),
    [modified_by] NVARCHAR(max) NOT NULL,
    CONSTRAINT [pk_activity] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[campaign] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF__campaign__id__3631FF56] DEFAULT newid(),
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
    [is_deleted] BIT NOT NULL CONSTRAINT [DF__campaign__is_del__3726238F] DEFAULT 0,
    [owner] NVARCHAR(max) NOT NULL,
    [created_at] DATETIME NOT NULL CONSTRAINT [DF__campaign__create__381A47C8] DEFAULT getutcdate(),
    [created_by] NVARCHAR(max) NOT NULL,
    [modified_at] DATETIME NOT NULL CONSTRAINT [DF__campaign__modifi__390E6C01] DEFAULT getutcdate(),
    [modified_by] NVARCHAR(max) NOT NULL,
    CONSTRAINT [pk_campaign] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[case] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF__case__id__27E3DFFF] DEFAULT newid(),
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
    [is_escalated] BIT NOT NULL CONSTRAINT [DF__case__is_escalat__28D80438] DEFAULT 0,
    [closed_datetime] DATETIME,
    [description] NVARCHAR(max),
    [is_deleted] BIT NOT NULL CONSTRAINT [DF__case__is_deleted__29CC2871] DEFAULT 0,
    [owner] NVARCHAR(max) NOT NULL,
    [created_at] DATETIME NOT NULL CONSTRAINT [DF__case__created_at__2AC04CAA] DEFAULT getutcdate(),
    [created_by] NVARCHAR(max) NOT NULL,
    [modified_at] DATETIME NOT NULL CONSTRAINT [DF__case__modified_a__2BB470E3] DEFAULT getutcdate(),
    [modified_by] NVARCHAR(max) NOT NULL,
    CONSTRAINT [pk_case] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[contact] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF__contact__id__222B06A9] DEFAULT newid(),
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
    [is_deleted] BIT NOT NULL CONSTRAINT [DF__contact__is_dele__231F2AE2] DEFAULT 0,
    [owner] NVARCHAR(max) NOT NULL,
    [created_at] DATETIME NOT NULL CONSTRAINT [DF__contact__created__24134F1B] DEFAULT getutcdate(),
    [created_by] NVARCHAR(max) NOT NULL,
    [modified_at] DATETIME NOT NULL CONSTRAINT [DF__contact__modifie__25077354] DEFAULT getutcdate(),
    [modified_by] NVARCHAR(max) NOT NULL,
    CONSTRAINT [pk_contact] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[entity] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF__entity__id__737017C0] DEFAULT newid(),
    [name] NVARCHAR(255) NOT NULL,
    [display_name] NVARCHAR(255) NOT NULL,
    [order] SMALLINT NOT NULL CONSTRAINT [DF__entity__order__74643BF9] DEFAULT 0,
    [created_at] DATETIME NOT NULL CONSTRAINT [DF__entity__created___75586032] DEFAULT getutcdate(),
    [created_by] UNIQUEIDENTIFIER NOT NULL,
    [modified_at] DATETIME NOT NULL CONSTRAINT [DF__entity__modified__764C846B] DEFAULT getutcdate(),
    [modified_by] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [pk_entity] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [uk_entity_1] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[entity_item] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF__entity_item__id__7C055DC1] DEFAULT newid(),
    [entity_id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [display_name] NVARCHAR(255) NOT NULL,
    [order] SMALLINT NOT NULL CONSTRAINT [DF__entity_it__order__7CF981FA] DEFAULT 0,
    [type] NVARCHAR(20) NOT NULL,
    [sub_type] NVARCHAR(20),
    [is_required] BIT NOT NULL CONSTRAINT [DF__entity_it__is_re__7DEDA633] DEFAULT 0,
    [is_filterable] BIT NOT NULL CONSTRAINT [DF__entity_it__is_fi__7EE1CA6C] DEFAULT 0,
    [is_creatable] BIT NOT NULL CONSTRAINT [DF__entity_it__is_cr__7FD5EEA5] DEFAULT 0,
    [is_updatable] BIT NOT NULL CONSTRAINT [DF__entity_it__is_up__00CA12DE] DEFAULT 0,
    [is_formula] BIT NOT NULL CONSTRAINT [DF__entity_it__is_fo__01BE3717] DEFAULT 0,
    [max_length] SMALLINT,
    [precision] SMALLINT,
    [scale] SMALLINT,
    [reference_entities] NVARCHAR(max),
    [created_at] DATETIME NOT NULL CONSTRAINT [DF__entity_it__creat__02B25B50] DEFAULT getutcdate(),
    [created_by] UNIQUEIDENTIFIER NOT NULL,
    [modified_at] DATETIME NOT NULL CONSTRAINT [DF__entity_it__modif__03A67F89] DEFAULT getutcdate(),
    [modified_by] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [pk_entity_item] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [uk_entity_item_1] UNIQUE NONCLUSTERED ([entity_id],[name])
);

-- CreateTable
CREATE TABLE [dbo].[entity_item_option] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF__entity_item___id__0C3BC58A] DEFAULT newid(),
    [entity_item_id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [display_name] NVARCHAR(255) NOT NULL,
    [order] SMALLINT NOT NULL CONSTRAINT [DF__entity_it__order__0D2FE9C3] DEFAULT 0,
    [is_default] BIT NOT NULL CONSTRAINT [DF__entity_it__is_de__0E240DFC] DEFAULT 0,
    [created_at] DATETIME NOT NULL CONSTRAINT [DF__entity_it__creat__0F183235] DEFAULT getutcdate(),
    [created_by] UNIQUEIDENTIFIER NOT NULL,
    [modified_at] DATETIME NOT NULL CONSTRAINT [DF__entity_it__modif__100C566E] DEFAULT getutcdate(),
    [modified_by] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [pk_entity_item_option] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [uk_entity_item_option_1] UNIQUE NONCLUSTERED ([entity_item_id],[name])
);

-- CreateTable
CREATE TABLE [dbo].[file] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF__file__id__6BCEF5F8] DEFAULT newid(),
    [name] NVARCHAR(255) NOT NULL,
    [type] NVARCHAR(20) NOT NULL,
    [content] VARBINARY(max) NOT NULL,
    [created_at] DATETIME NOT NULL CONSTRAINT [DF__file__created_at__6CC31A31] DEFAULT getutcdate(),
    [created_by] UNIQUEIDENTIFIER NOT NULL,
    [modified_at] DATETIME NOT NULL CONSTRAINT [DF__file__modified_a__6DB73E6A] DEFAULT getutcdate(),
    [modified_by] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [pk_file] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[lead] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF__lead__id__15C52FC4] DEFAULT newid(),
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
    [is_converted] BIT CONSTRAINT [DF__lead__is_convert__16B953FD] DEFAULT 0,
    [converted_date] DATE,
    [is_deleted] BIT NOT NULL CONSTRAINT [DF__lead__is_deleted__17AD7836] DEFAULT 0,
    [owner] NVARCHAR(max) NOT NULL,
    [created_at] DATETIME NOT NULL CONSTRAINT [DF__lead__created_at__18A19C6F] DEFAULT getutcdate(),
    [created_by] NVARCHAR(max) NOT NULL,
    [modified_at] DATETIME NOT NULL CONSTRAINT [DF__lead__modified_a__1995C0A8] DEFAULT getutcdate(),
    [modified_by] NVARCHAR(max) NOT NULL,
    CONSTRAINT [pk_lead] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[opportunity] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF__opportunity__id__4944D3CA] DEFAULT newid(),
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
    [is_closed] BIT NOT NULL CONSTRAINT [DF__opportuni__is_cl__4A38F803] DEFAULT 0,
    [description] NVARCHAR(max),
    [is_deleted] BIT NOT NULL CONSTRAINT [DF__opportuni__is_de__4B2D1C3C] DEFAULT 0,
    [owner] NVARCHAR(max) NOT NULL,
    [created_at] DATETIME NOT NULL CONSTRAINT [DF__opportuni__creat__4C214075] DEFAULT getutcdate(),
    [created_by] NVARCHAR(max) NOT NULL,
    [modified_at] DATETIME NOT NULL CONSTRAINT [DF__opportuni__modif__4D1564AE] DEFAULT getutcdate(),
    [modified_by] NVARCHAR(max) NOT NULL,
    CONSTRAINT [pk_opportunity] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[phone_call] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF__phone_call__id__438BFA74] DEFAULT newid(),
    [subject] NVARCHAR(256) NOT NULL,
    [user] NVARCHAR(max) NOT NULL,
    [their] NVARCHAR(max) NOT NULL,
    [phone_number] NVARCHAR(50),
    [direction] NVARCHAR(max) NOT NULL,
    [start_date_time] DATETIME,
    [end_date_time] DATETIME,
    [status] NVARCHAR(max),
    [description] NVARCHAR(max),
    [is_deleted] BIT NOT NULL CONSTRAINT [DF__phone_cal__is_de__44801EAD] DEFAULT 0,
    [owner] NVARCHAR(max) NOT NULL,
    [created_at] DATETIME NOT NULL CONSTRAINT [DF__phone_cal__creat__457442E6] DEFAULT getutcdate(),
    [created_by] NVARCHAR(max) NOT NULL,
    [modified_at] DATETIME NOT NULL CONSTRAINT [DF__phone_cal__modif__4668671F] DEFAULT getutcdate(),
    [modified_by] NVARCHAR(max) NOT NULL,
    CONSTRAINT [pk_phone_call] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[product] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF__product__id__2E90DD8E] DEFAULT newid(),
    [name] NVARCHAR(256) NOT NULL,
    [product] NVARCHAR(256),
    [description] NVARCHAR(max),
    [is_active] BIT NOT NULL CONSTRAINT [DF__product__is_acti__2F8501C7] DEFAULT 0,
    [family] NVARCHAR(max),
    [external_id] NVARCHAR(256),
    [url] NVARCHAR(max),
    [quantity_unit] NVARCHAR(max),
    [is_archived] BIT NOT NULL CONSTRAINT [DF__product__is_arch__30792600] DEFAULT 0,
    [is_deleted] BIT NOT NULL CONSTRAINT [DF__product__is_dele__316D4A39] DEFAULT 0,
    [owner] NVARCHAR(max) NOT NULL,
    [created_at] DATETIME NOT NULL CONSTRAINT [DF__product__created__32616E72] DEFAULT getutcdate(),
    [created_by] NVARCHAR(max) NOT NULL,
    [modified_at] DATETIME NOT NULL CONSTRAINT [DF__product__modifie__335592AB] DEFAULT getutcdate(),
    [modified_by] NVARCHAR(max) NOT NULL,
    CONSTRAINT [pk_product] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[profile] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF__profile__id__5026DB83] DEFAULT newid(),
    [name] NVARCHAR(256) NOT NULL,
    [display_name] NVARCHAR(256) NOT NULL,
    [order] SMALLINT NOT NULL CONSTRAINT [DF__profile__order__511AFFBC] DEFAULT 0,
    [created_at] DATETIME NOT NULL CONSTRAINT [DF__profile__created__520F23F5] DEFAULT getutcdate(),
    [created_by] UNIQUEIDENTIFIER NOT NULL,
    [modified_at] DATETIME NOT NULL CONSTRAINT [DF__profile__modifie__5303482E] DEFAULT getutcdate(),
    [modified_by] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [pk_profile] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [uk_profile_1] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[role] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF__role__id__58BC2184] DEFAULT newid(),
    [name] NVARCHAR(256) NOT NULL,
    [display_name] NVARCHAR(256) NOT NULL,
    [order] SMALLINT NOT NULL CONSTRAINT [DF__role__order__59B045BD] DEFAULT 0,
    [parent_id] UNIQUEIDENTIFIER,
    [created_at] DATETIME NOT NULL CONSTRAINT [DF__role__created_at__5AA469F6] DEFAULT getutcdate(),
    [created_by] UNIQUEIDENTIFIER NOT NULL,
    [modified_at] DATETIME NOT NULL CONSTRAINT [DF__role__modified_a__5B988E2F] DEFAULT getutcdate(),
    [modified_by] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [pk_role] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [uk_role_1] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[sample] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF__sample__id__4FF1D159] DEFAULT newid(),
    [name] NVARCHAR(256) NOT NULL,
    [text] NVARCHAR(max),
    [textarea] NVARCHAR(max),
    [phone_number] NVARCHAR(50),
    [email] NVARCHAR(max),
    [url] NVARCHAR(max),
    [combobox] NVARCHAR(max),
    [integer] DECIMAL(16,0),
    [decimal] DECIMAL(16,2),
    [boolean] BIT CONSTRAINT [DF__sample__boolean__50E5F592] DEFAULT 0,
    [date] DATE,
    [datetime] DATETIME,
    [time] TIME,
    [option_single] NVARCHAR(max),
    [option_multi] NVARCHAR(max),
    [reference_single_target_single_id] NVARCHAR(max),
    [reference_single_target_multi_id] NVARCHAR(max),
    [reference_multi_target_single_id] NVARCHAR(max),
    [reference_multi_target_multi_id] NVARCHAR(max),
    [is_deleted] BIT NOT NULL CONSTRAINT [DF__sample__is_delet__51DA19CB] DEFAULT 0,
    [owner] NVARCHAR(max) NOT NULL,
    [created_at] DATETIME NOT NULL CONSTRAINT [DF__sample__created___52CE3E04] DEFAULT getutcdate(),
    [created_by] NVARCHAR(max) NOT NULL,
    [modified_at] DATETIME NOT NULL CONSTRAINT [DF__sample__modified__53C2623D] DEFAULT getutcdate(),
    [modified_by] NVARCHAR(max) NOT NULL,
    CONSTRAINT [pk_sample] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[user] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF__user__id__4979DDF4] DEFAULT newid(),
    [user_name] NVARCHAR(256) NOT NULL,
    [hashed_password] NVARCHAR(max) NOT NULL,
    [first_name] NVARCHAR(256) NOT NULL,
    [last_name] NVARCHAR(256) NOT NULL,
    [email] NVARCHAR(max),
    [timezone] NVARCHAR(max),
    [language] NVARCHAR(max),
    [is_active] BIT NOT NULL CONSTRAINT [DF__user__is_active__4A6E022D] DEFAULT 0,
    [created_at] DATETIME NOT NULL CONSTRAINT [DF__user__created_at__4B622666] DEFAULT getutcdate(),
    [modified_at] DATETIME NOT NULL CONSTRAINT [DF__user__modified_a__4C564A9F] DEFAULT getutcdate(),
    CONSTRAINT [pk_user] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [uk_user_1] UNIQUE NONCLUSTERED ([user_name])
);

-- CreateTable
CREATE TABLE [dbo].[user_access_control] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF__user_access___id__62458BBE] DEFAULT newid(),
    [user_id] UNIQUEIDENTIFIER NOT NULL,
    [profile_id] UNIQUEIDENTIFIER NOT NULL,
    [role_id] UNIQUEIDENTIFIER,
    [created_at] DATETIME NOT NULL CONSTRAINT [DF__user_acce__creat__6339AFF7] DEFAULT getutcdate(),
    [created_by] UNIQUEIDENTIFIER NOT NULL,
    [modified_at] DATETIME NOT NULL CONSTRAINT [DF__user_acce__modif__642DD430] DEFAULT getutcdate(),
    [modified_by] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [pk_user_access_control] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [uk_user_access_control_1] UNIQUE NONCLUSTERED ([user_id])
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
ALTER TABLE [dbo].[file] ADD CONSTRAINT [fk_file_created_by] FOREIGN KEY ([created_by]) REFERENCES [dbo].[user]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[file] ADD CONSTRAINT [fk_file_modified_by] FOREIGN KEY ([modified_by]) REFERENCES [dbo].[user]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

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

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
