// Country codes and names mapping
export const COUNTRY_NAMES: { [code: string]: string } = {
  // Standard ISO country codes
  'US': 'United States',
  'IN': 'India',
  'DE': 'Germany',
  'CN': 'China',
  'RU': 'Russia',
  'BR': 'Brazil',
  'GB': 'United Kingdom',
  'FR': 'France',
  'CA': 'Canada',
  'AU': 'Australia',
  'JP': 'Japan',
  'KR': 'South Korea',
  'ZA': 'South Africa',
  'MX': 'Mexico',
  'ID': 'Indonesia',
  'IT': 'Italy',
  'ES': 'Spain',
  'NL': 'Netherlands',
  'SG': 'Singapore',
  'SE': 'Sweden',
  
  // Continental/Regional codes
  'EU': 'Europe',
  'AS': 'Asia',
  'AF': 'Africa',
  'OC': 'Australia/Oceania',
  'NA': 'North America',
  'EE': 'Eastern Europe',
  'ME': 'Middle East',
  'WE': 'Western Europe',
  'SEA': 'Southeast Asia',
  'SP': 'South Pacific',
  'CE': 'Central Europe',
  'NE': 'Northern Europe',
  'SER': 'Southern Europe',
  'CAS': 'Central Asia',
  'LAM': 'Latin America',
  'CAR': 'Caribbean',
  'NAF': 'North Africa',
  'EAF': 'East Africa',
  'WAF': 'West Africa',
  'SAF': 'Southern Africa',
  'CEU': 'Central Europe',
  'EA': 'East Asia',
  'SA': 'South Asia',
  'NOR': 'Nordic Region',
  
  // Additional countries
  'AR': 'Argentina',
  'BE': 'Belgium',
  'CL': 'Chile',
  'CO': 'Colombia',
  'DK': 'Denmark',
  'EG': 'Egypt',
  'FI': 'Finland',
  'GR': 'Greece',
  'HK': 'Hong Kong',
  'HU': 'Hungary',
  'IE': 'Ireland',
  'IL': 'Israel',
  'MY': 'Malaysia',
  'NO': 'Norway',
  'NZ': 'New Zealand',
  'PH': 'Philippines',
  'PL': 'Poland',
  'PT': 'Portugal',
  'RO': 'Romania',
  'TH': 'Thailand',
  'TR': 'Turkey',
  'TW': 'Taiwan',
  'UA': 'Ukraine',
  'VN': 'Vietnam',
  'AT': 'Austria',
  'CH': 'Switzerland',
  'CZ': 'Czech Republic',
  'PK': 'Pakistan',
  'BD': 'Bangladesh',
  'NG': 'Nigeria',
  'KE': 'Kenya',
  'MA': 'Morocco',
  'SAU': 'Saudi Arabia',
  'AE': 'United Arab Emirates',
  'QA': 'Qatar',
  
  // Specific numeric IP prefixes seen in the screenshots
  '3': 'North America',
  '4': 'Northern Europe', 
  '51': 'South Pacific',
  '54': 'Chile',
  '68': 'Caribbean',
  '98': 'Nordic Region',
  '21': 'North Africa',
  '38': 'Switzerland',
  '74': 'Central Europe',
  '85': 'East Asia',
  
  // Non-standard codes that might come from the SQL
  'UK': 'United Kingdom', // Alternative code sometimes used for GB
  'SUI': 'Switzerland'    // Alternative code sometimes used for CH
};

// The SQL query fragment for determining country codes
export const COUNTRY_CODE_SQL_FRAGMENT = `
  CASE
    -- Try to extract country code from IP
    WHEN SUBSTR(ip_address, 1, 2) IN ('34', '35', '52', '104', '35') THEN 'US'
    WHEN SUBSTR(ip_address, 1, 2) IN ('47', '13', '4') THEN 'EU'
    WHEN SUBSTR(ip_address, 1, 2) IN ('20', '57', '32') THEN 'AS'
    WHEN SUBSTR(ip_address, 1, 2) IN ('52', '6') THEN 'LAM' -- Latin America
    WHEN SUBSTR(ip_address, 1, 2) IN ('2a', '25', '26', '27', '28', '29') THEN 'AF'
    WHEN SUBSTR(ip_address, 1, 2) IN ('17', '33', '69') THEN 'OC'
    WHEN SUBSTR(ip_address, 1, 2) IN ('40', '41', '42', '43', '44') THEN 'EE'
    WHEN SUBSTR(ip_address, 1, 2) IN ('18', '12', '70') THEN 'ME'
    WHEN SUBSTR(ip_address, 1, 2) IN ('3') THEN 'CA'
    WHEN SUBSTR(ip_address, 1, 2) IN ('23') THEN 'GB'
    WHEN SUBSTR(ip_address, 1, 2) IN ('9', '67') THEN 'JP'
    WHEN SUBSTR(ip_address, 1, 2) IN ('10', '66') THEN 'KR'
    WHEN SUBSTR(ip_address, 1, 2) IN ('11', '31') THEN 'IN'
    WHEN SUBSTR(ip_address, 1, 2) IN ('14') THEN 'RU'
    WHEN SUBSTR(ip_address, 1, 2) IN ('15', '65', '64') THEN 'CN'
    WHEN SUBSTR(ip_address, 1, 2) IN ('16') THEN 'AU'
    WHEN SUBSTR(ip_address, 1, 2) IN ('5') THEN 'MX'
    WHEN SUBSTR(ip_address, 1, 2) IN ('7', '48', '49', '50') THEN 'SER' -- Southern Europe Region
    WHEN SUBSTR(ip_address, 1, 2) IN ('8') THEN 'CAS' -- Central Asia
    -- Handle specific region codes seen in screenshots
    WHEN SUBSTR(ip_address, 1, 2) = '51' THEN 'SP'  -- South Pacific
    WHEN SUBSTR(ip_address, 1, 2) = '68' THEN 'CAR' -- Caribbean
    WHEN SUBSTR(ip_address, 1, 2) = '54' THEN 'CL'  -- Chile
    WHEN SUBSTR(ip_address, 1, 2) = '98' THEN 'NOR' -- Northern Region
    WHEN SUBSTR(ip_address, 1, 2) = '74' THEN 'CEU' -- Central Europe
    WHEN SUBSTR(ip_address, 1, 2) = '85' THEN 'EA'  -- East Asia
    WHEN SUBSTR(ip_address, 1, 2) = '21' THEN 'NAF' -- North Africa
    WHEN SUBSTR(ip_address, 1, 2) = '38' THEN 'CH'  -- Switzerland
    
    -- More specific mapping for common codes
    WHEN SUBSTR(ip_address, 1, 1) = '1' THEN 'NA'   -- North America
    WHEN SUBSTR(ip_address, 1, 1) = '2' THEN 'EU'   -- Europe
    WHEN SUBSTR(ip_address, 1, 1) = '3' THEN 'NA'   -- North America
    WHEN SUBSTR(ip_address, 1, 1) = '4' THEN 'NE'   -- Northern Europe
    WHEN SUBSTR(ip_address, 1, 1) = '5' THEN 'LAM'  -- Latin America
    WHEN SUBSTR(ip_address, 1, 1) = '6' THEN 'AS'   -- Asia
    WHEN SUBSTR(ip_address, 1, 1) = '7' THEN 'EU'   -- Europe
    WHEN SUBSTR(ip_address, 1, 1) = '8' THEN 'OC'   -- Oceania
    WHEN SUBSTR(ip_address, 1, 1) = '9' THEN 'AS'   -- Asia
    ELSE SUBSTR(ip_address, 1, 2)
  END
`;

/**
 * Get country name by code with intelligent fallback
 */
export const getCountryName = (code: string): string => {
  // Check if the country exists in our mapping
  if (COUNTRY_NAMES[code]) {
    return COUNTRY_NAMES[code];
  }
  
  // For numeric codes, try to give more meaningful names based on region patterns
  if (/^\d+$/.test(code)) {
    const firstDigit = code.charAt(0);
    
    // Region mapping based on first digit
    const firstDigitMap: {[key: string]: string} = {
      '1': 'North America',
      '2': 'Europe',
      '3': 'North America',
      '4': 'Northern Europe',
      '5': 'Latin America',
      '6': 'Asia',
      '7': 'Europe',
      '8': 'Asia/Pacific',
      '9': 'East Asia'
    };
    
    if (firstDigitMap[firstDigit]) {
      return `${firstDigitMap[firstDigit]} Region ${code}`;
    }
  }
  
  // If still no match, provide a cleaner fallback
  return `Region ${code}`;
};

/**
 * Get color based on percentage value
 */
export const getColorByPercentage = (percentage: number): string => {
  if (percentage > 20) return '#1e40af'; // dark blue (high)
  if (percentage > 10) return '#3b82f6'; // medium blue
  if (percentage > 5) return '#60a5fa';  // light blue
  if (percentage > 1) return '#93c5fd';  // lighter blue
  return '#dbeafe';                      // very light blue (low)
}; 