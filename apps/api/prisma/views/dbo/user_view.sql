CREATE VIEW user_view AS
SELECT
  *,
  CONCAT(last_name, first_name) AS full_name
FROM
  [user];