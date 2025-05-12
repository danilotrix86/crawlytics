import { COUNTRY_CODE_SQL_FRAGMENT } from './countryMappings';

// Cookie name constant
export const COOKIE_NAME = 'selected_log_file';

/**
 * SQL Query to get geo data for the world map
 */
export const getGeoDataQuery = () => `
  SELECT 
    ${COUNTRY_CODE_SQL_FRAGMENT} AS country_code,
    COUNT(*) as request_count
  FROM 
    access_logs
  {WHERE_CLAUSE}
  GROUP BY 
    country_code
  ORDER BY 
    request_count DESC
`;

/**
 * SQL Query for top countries data
 */
export const getTopCountriesQuery = () => `
  WITH CountryData AS (
    SELECT 
      ${COUNTRY_CODE_SQL_FRAGMENT} AS country_code,
      COUNT(*) as request_count,
      COUNT(DISTINCT ip_address) as unique_ips,
      CAST((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM access_logs {TOTAL_CONDITION})) AS REAL) as percentage
    FROM 
      access_logs
    {WHERE_CLAUSE}
    GROUP BY 
      country_code
    ORDER BY 
      request_count DESC
    LIMIT 10
  )
  SELECT 
    cd.country_code,
    cd.request_count,
    cd.unique_ips,
    cd.percentage,
    (
      SELECT 
        GROUP_CONCAT(
          crawler_name || ' (' || bot_count || ')',
          ', '
        )
      FROM (
        SELECT 
          CASE 
            WHEN crawler_name IS NULL OR crawler_name = '' THEN 'Other'
            ELSE crawler_name 
          END as crawler_name,
          COUNT(*) as bot_count
        FROM 
          access_logs a
        {BOT_WHERE_CLAUSE}
          AND ${COUNTRY_CODE_SQL_FRAGMENT} = cd.country_code
        GROUP BY 
          crawler_name
        ORDER BY 
          bot_count DESC
        LIMIT 3
      )
    ) as top_bots
  FROM 
    CountryData cd
  ORDER BY 
    cd.request_count DESC
`;

/**
 * SQL Query for top IPs data
 */
export const getTopIpsQuery = () => `
  SELECT 
    ip_address,
    COUNT(*) as request_count,
    (
      SELECT crawler_name 
      FROM access_logs a2 
      WHERE a2.ip_address = a1.ip_address 
        {CRAWLER_LOG_FILE_CONDITION}
        AND crawler_name IS NOT NULL 
        AND crawler_name != '' 
      GROUP BY crawler_name 
      ORDER BY COUNT(*) DESC 
      LIMIT 1
    ) as crawler_name,
    MAX(time) as last_seen
  FROM 
    access_logs a1
  {WHERE_CLAUSE}
  GROUP BY 
    ip_address
  ORDER BY 
    request_count DESC
  LIMIT 20
`;

/**
 * Helper to prepare SQL query based on log file selection
 */
export const prepareQuery = (sqlQuery: string, logFileId: string | null) => {
  let params: any[] = [];
  
  if (logFileId) {
    sqlQuery = sqlQuery.replace("{WHERE_CLAUSE}", "WHERE log_file_id = ?");
    sqlQuery = sqlQuery.replace("{TOTAL_CONDITION}", "WHERE log_file_id = ?");
    sqlQuery = sqlQuery.replace("{BOT_WHERE_CLAUSE}", "WHERE log_file_id = ?");
    sqlQuery = sqlQuery.replace("{CRAWLER_LOG_FILE_CONDITION}", "AND log_file_id = ?");
    params = Array(sqlQuery.match(/\?/g)?.length || 0).fill(logFileId);
  } else {
    sqlQuery = sqlQuery.replace("{WHERE_CLAUSE}", "");
    sqlQuery = sqlQuery.replace("{TOTAL_CONDITION}", "");
    sqlQuery = sqlQuery.replace("{BOT_WHERE_CLAUSE}", "WHERE 1=1");
    sqlQuery = sqlQuery.replace("{CRAWLER_LOG_FILE_CONDITION}", "");
  }
  
  return { sqlQuery, params };
}; 