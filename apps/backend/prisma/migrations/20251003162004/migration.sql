BEGIN TRY

BEGIN TRAN;

-- `language`カラムを`locale`にリネーム
EXEC sp_rename 'dbo.user.language', 'locale', 'COLUMN';

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
  ROLLBACK TRAN;
END;
THROW

END CATCH
