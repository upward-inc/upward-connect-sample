BEGIN TRY

BEGIN TRAN;

-- 20 文字を超える MIME タイプ（Bun が付与する `;charset=utf-8` を含む）を保存できるよう広げる
-- 長さは type/subtype の最大長（RFC 6838 で type・subtype が各 127 文字）を目安にしている
ALTER TABLE [file] ALTER COLUMN [type] NVARCHAR(255) NOT NULL;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
  ROLLBACK TRAN;
END;
THROW

END CATCH
