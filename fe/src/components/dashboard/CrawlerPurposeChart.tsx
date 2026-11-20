import React, { useMemo } from 'react';
import { DonutChartUI } from '../charts/DonutChartUI';
import { transformGenericDonutData } from '../charts/DonutChartTransformer';
import { useLogFileData, DataComponentWrapper, createTitle } from '../../shared/analytics-utils';
import { CATEGORY_COLORS, categoryLabel } from '../../utils/crawlerCategories';

interface CategoryRow {
  category: string | null;
  count: number;
}

const QUERY = `
  SELECT ci.category AS category, COUNT(*) AS count
  FROM access_logs a
  LEFT JOIN crawler_info ci ON ci.crawler_name = a.crawler_name
  WHERE 1=1 {LOG_FILE_CONDITION}
  GROUP BY ci.category
  ORDER BY count DESC
`;

const CrawlerPurposeChartContent: React.FC = () => {
  const { data, logFileId } = useLogFileData<CategoryRow[]>(QUERY, []);

  const chartData = useMemo(() => {
    const rows = (Array.isArray(data) ? data : []).map((row) => ({
      label: categoryLabel(row.category),
      value: Number(row.count),
    }));
    return transformGenericDonutData(rows, 'label', 'value', {
      title: createTitle('🎯 Why Crawlers Visit', logFileId),
      colorMap: CATEGORY_COLORS,
      tooltipSuffix: 'requests',
      emptyMessage: 'No crawler data available',
    });
  }, [data, logFileId]);

  return <DonutChartUI options={chartData.options} series={chartData.series} testId="crawler-purpose-chart" />;
};

export const CrawlerPurposeChart: React.FC = () => (
  <DataComponentWrapper>
    <CrawlerPurposeChartContent />
  </DataComponentWrapper>
);

export default CrawlerPurposeChart;
