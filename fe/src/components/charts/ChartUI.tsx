import React from 'react';
import { SeriesItem } from './ChartTransformer';
import BaseChartUI, { BaseChartUIProps } from './BaseChartUI';
import useChartUtils from './useChartUtils';

// Define props for the UI component
export interface TimeSeriesChartUIProps 
	extends Omit<BaseChartUIProps, 'series' | 'hasDataFn'> {
	series: SeriesItem[];
}

// Memoized component for better performance
export const TimeSeriesChartUI = React.memo(function TimeSeriesChartUI({
	options,
	series,
	chartType = 'area',
	testId = 'time-series-chart',
	...restProps
}: TimeSeriesChartUIProps): React.ReactElement {
	const { hasTimeSeriesData } = useChartUtils();
	
	return (
		<BaseChartUI
			options={options}
			series={series}
			chartType={chartType}
			testId={testId}
			hasDataFn={hasTimeSeriesData}
			{...restProps}
		/>
	);
});

// Set display name for debugging
TimeSeriesChartUI.displayName = 'TimeSeriesChartUI';

// Export default component
export default TimeSeriesChartUI; 