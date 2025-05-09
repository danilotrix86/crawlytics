import React from 'react';
import { DonutSeries } from './DonutChartTransformer';
import BaseChartUI, { BaseChartUIProps } from './BaseChartUI';
import useChartUtils from './useChartUtils';

// Define props for the UI component
export interface DonutChartUIProps 
	extends Omit<BaseChartUIProps, 'series' | 'hasDataFn'> {
	series: DonutSeries;
}

// Memoized component for better performance
export const DonutChartUI = React.memo(function DonutChartUI({
	options,
	series,
	chartType = 'donut',
	testId = 'donut-chart',
	...restProps
}: DonutChartUIProps): React.ReactElement {
	const { hasDonutData } = useChartUtils();
	
	return (
		<BaseChartUI
			options={options}
			series={series}
			chartType={chartType} 
			testId={testId}
			hasDataFn={hasDonutData}
			{...restProps}
		/>
	);
});

// Set display name for debugging
DonutChartUI.displayName = 'DonutChartUI';

// Optional: Default export
export default DonutChartUI; 