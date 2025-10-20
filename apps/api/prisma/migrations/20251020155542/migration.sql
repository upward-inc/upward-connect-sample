BEGIN TRY

BEGIN TRAN;

ALTER TABLE [dbo].[published_auth_code] ADD [code_challenge] varchar(128) NULL, [code_challenge_method] varchar(10) NULL;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
  ROLLBACK TRAN;
END;
THROW

END CATCH
