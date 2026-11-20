/**
 * Country helpers. Country codes come from the backend's offline GeoIP lookup
 * (ISO 3166-1 alpha-2). Rows that couldn't be located use UNKNOWN_COUNTRY.
 */
// "ZZ" is the ISO code reserved for an unknown region (and contains no "?",
// which the query helpers count as SQL placeholders)
export const UNKNOWN_COUNTRY = 'ZZ';

/** SQL expression for a row's country, with unlocated rows grouped together */
export const COUNTRY_CODE_SQL_FRAGMENT = `COALESCE(country_code, '${UNKNOWN_COUNTRY}')`;

let regionNames: Intl.DisplayNames | null = null;
try {
  regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
} catch {
  regionNames = null;
}

/** English country name for an ISO code, e.g. "DE" -> "Germany" */
export const getCountryName = (code: string): string => {
  if (!code || code === UNKNOWN_COUNTRY) return 'Unknown location';
  try {
    return regionNames?.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
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
