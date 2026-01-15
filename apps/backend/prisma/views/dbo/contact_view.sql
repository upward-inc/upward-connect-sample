CREATE VIEW contact_view AS
SELECT
  *,
  CONCAT(last_name, first_name) AS full_name
FROM
  contact;