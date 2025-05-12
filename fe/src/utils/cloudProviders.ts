// Known cloud providers and data centers for IP identification
export const CLOUD_PROVIDERS: { [prefix: string]: string } = {
  '13.': 'AWS',
  '52.': 'AWS',
  '34.': 'Google Cloud',
  '35.': 'Google Cloud',
  '104.': 'Google Cloud',
  '20.': 'Microsoft Azure',
  '40.': 'Microsoft Azure',
  '51.': 'Microsoft Azure',
  '157.': 'Azure',
  '192.': 'Generic Datacenter',
  '68.': 'Comcast',
  '198.': 'Datacenter',
  '3.': 'AWS',
  '23.': 'Akamai',
  '128.': 'Academic/Research',
  '172.': 'Private',
  '8.8.': 'Google DNS',
  '1.1.': 'Cloudflare DNS',
  '54.': 'AWS'
};

/**
 * Helper function to determine the host organization from IP address
 */
export const getHostOrg = (ip: string): string => {
  for (const [prefix, provider] of Object.entries(CLOUD_PROVIDERS)) {
    if (ip.startsWith(prefix)) {
      return provider;
    }
  }
  return 'Unknown';
};

/**
 * Format date string to readable format
 */
export const formatDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleString();
  } catch (e) {
    return dateStr;
  }
}; 