import React from 'react';
import { ColumnSeriesItem } from './ColumnChartTransformer';
import BaseChartUI, { BaseChartUIProps } from './BaseChartUI';
import useChartUtils from './useChartUtils';

// Define props for the UI component
export interface ColumnBarChartUIProps 
	extends Omit<BaseChartUIProps, 'series' | 'hasDataFn'> {
	series: ColumnSeriesItem[];
}

// Memoized component for better performance
export const ColumnBarChartUI = React.memo(function ColumnBarChartUI({
	options,
	series,
	chartType = 'bar',
	testId = 'column-bar-chart',
	...restProps
}: ColumnBarChartUIProps): React.ReactElement {
	const { hasColumnData } = useChartUtils();
	
	return (
		<BaseChartUI
			options={options}
			series={series}
			chartType={chartType}
			testId={testId}
			hasDataFn={hasColumnData}
			{...restProps}
		/>
	);
});

// Set display name for debugging
ColumnBarChartUI.displayName = 'ColumnBarChartUI';

// Optional: Default export
export default ColumnBarChartUI; 