CREATE VIEW lead_view AS
SELECT
  *,
  CONCAT(last_name, first_name) AS full_name,
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
          entity = 'lead'
          AND id = lead.id
      )
    ORDER BY
      start_date_time DESC
  ) AS last_activity_date
FROM
  lead;