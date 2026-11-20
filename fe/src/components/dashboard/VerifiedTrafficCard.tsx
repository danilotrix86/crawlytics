import React from 'react';
import { Component as StatsCard } from '../stats/StatsCard';
import { ShieldCheck } from 'flowbite-react-icons/outline';
import { useLogFileData, DataComponentWrapper } from '../../shared/analytics-utils';

interface VerificationCounts {
  total: number;
  verified: number;
  suspicious: number;
  unverifiable: number;
  unchecked: number;
}

const QUERY = `
  SELECT
    COUNT(*) AS total,
    COALESCE(SUM(verification = 'verified'), 0) AS verified,
    COALESCE(SUM(verification = 'suspicious'), 0) AS suspicious,
    COALESCE(SUM(verification = 'unknown'), 0) AS unverifiable,
    COALESCE(SUM(verification IS NULL), 0) AS unchecked
  FROM access_logs
  WHERE 1=1 {LOG_FILE_CONDITION}
`;

const VerifiedTrafficCardComponent: React.FC = () => {
  const { data } = useLogFileData<VerificationCounts[], VerificationCounts | undefined>(QUERY, [], (rows) => rows?.[0]);

  const checked = (data?.total ?? 0) - (data?.unchecked ?? 0);
  const percent = checked > 0 ? ((data!.verified / checked) * 100).toFixed(1) + '%' : '—';
  const parts = [
    `${(data?.suspicious ?? 0).toLocaleString()} suspicious`,
    `${(data?.unverifiable ?? 0).toLocaleString()} unverifiable`,
  ];
  if (data?.unchecked) parts.push(`${data.unchecked.toLocaleString()} not checked`);

  return (
    <StatsCard
      data={{ title: '🛡️ Verified Requests', number: percent, subtext: parts.join(' · ') }}
      icon={ShieldCheck}
    />
  );
};

export const VerifiedTrafficCard: React.FC = () => (
  <DataComponentWrapper>
    <VerifiedTrafficCardComponent />
  </DataComponentWrapper>
);

export default VerifiedTrafficCard;
