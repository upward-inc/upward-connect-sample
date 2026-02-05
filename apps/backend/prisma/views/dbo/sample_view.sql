CREATE VIEW sample_view AS
SELECT
  *,
  'This is your sample text: ' + [text] AS formula_text,
  [integer] * 100 AS formula_integer,
  CASE
    boolean
    WHEN 0 THEN 1
    ELSE 0
  END AS formula_boolean,
  CAST([datetime] AS DATE) AS formula_date,
  (
    SELECT
      TOP 1 'account' AS entity,
      LOWER(id) AS id
    FROM
      account
    ORDER BY
      created_at DESC FOR JSON PATH,
      WITHOUT_ARRAY_WRAPPER
  ) AS formula_reference_single_target_single_id
FROM
  sample;