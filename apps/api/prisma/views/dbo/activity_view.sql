SELECT
  *,
  DATEDIFF(MINUTE, start_date_time, end_date_time) AS duration_in_minutes
FROM
  activity;