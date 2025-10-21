CREATE VIEW account_view AS
SELECT
  *,
  (
    SELECT
      TOP 1 CAST(DATEADD(HOUR, 9, [start_date_time]) AS DATE)
    FROM
      activity
    WHERE
      EXISTS (
        SELECT
          *
        FROM
          OPENJSON(target) WITH (entity NVARCHAR(MAX), id NVARCHAR(MAX))
        WHERE
          entity = 'account'
          AND id = account.id
      )
    ORDER BY
      start_date_time DESC
  ) AS last_activity_date
FROM
  account;