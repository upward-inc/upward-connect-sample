BEGIN TRY

BEGIN TRAN;

DROP TABLE IF EXISTS [published_auth_code];

CREATE TABLE [published_auth_code]
(
  [auth_code] NVARCHAR(255) NOT NULL,
  [client_id] NVARCHAR(MAX) NOT NULL,
  [client_secret] NVARCHAR(MAX) NOT NULL,
  [redirect_uri] NVARCHAR(MAX) NOT NULL,
  [scope] NVARCHAR(MAX),
  [state] NVARCHAR(MAX),
  [nonce] NVARCHAR(MAX),
  [published_at] DATETIME NOT NULL,
  [expire_at] DATETIME NOT NULL,
  [user_id] UNIQUEIDENTIFIER NOT NULL,
  CONSTRAINT [pk_published_auth_code] PRIMARY KEY ([auth_code]),
  CONSTRAINT[fk_published_auth_code_user_id] FOREIGN KEY([user_id]) REFERENCES [user]([id]),
);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
  ROLLBACK TRAN;
END;
THROW

END CATCH
