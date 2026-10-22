BEGIN TRY

BEGIN TRAN;

-- 20 文字を超える MIME タイプ（docx の `application/vnd.openxmlformats-officedocument.wordprocessingml.document` など）を保存できるよう広げる
-- 保存するのはパラメータを除いた type/subtype で、長さはその最大長（RFC 6838 で type・subtype が各 127 文字、`/` を含めて 255 文字）に合わせている
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
