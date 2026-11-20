import React from 'react';

export type Verification = 'verified' | 'suspicious' | 'unknown' | null | undefined;

const STYLES: Record<string, { label: string; className: string; title: string }> = {
  verified: {
    label: 'Verified',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-300',
    title: "The IP belongs to the crawler's operator (published IP ranges, its network, or reverse DNS).",
  },
  suspicious: {
    label: 'Suspicious',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300',
    title:
      "The IP isn't in the operator's published IP lists. Usually a spoofed user agent, though operators also retire old IPs, so very old logs can be flagged by mistake.",
  },
  unknown: {
    label: 'Unverifiable',
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    title: "This crawler's operator doesn't publish a way to verify it, or the data couldn't be downloaded.",
  },
  pending: {
    label: 'Not checked',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/60 dark:text-yellow-300',
    title: 'Imported before verification existed. Use "Check now" to verify these requests.',
  },
};

export const VerificationBadge: React.FC<{ value: Verification }> = ({ value }) => {
  const style = STYLES[value ?? 'pending'] ?? STYLES.unknown;
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${style.className}`} title={style.title}>
      {style.label}
    </span>
  );
};

export default VerificationBadge;
