import React, { useCallback } from 'react';
import BaseChartUI, { BaseChartUIProps } from './BaseChartUI';
import { BarChartSeriesItem } from './BarChartTransformer';

// Define props for the Bar Chart UI component
export interface BarChartUIProps extends Omit<BaseChartUIProps, 'series' | 'hasDataFn'> {
	series: BarChartSeriesItem[]; // Use the correct series type from BarChartTransformer
}

// Memoized component for better performance
export const BarChartUI = React.memo(function BarChartUI({
	options,
	series,
	chartType = 'bar',
	testId = 'bar-chart',
	...restProps
}: BarChartUIProps): React.ReactElement {
	// Define a specific hasData function for bar charts with simple number[] data structure
	const hasData = useCallback((seriesData: BarChartSeriesItem[]): boolean => {
		if (!Array.isArray(seriesData) || seriesData.length === 0) {
			return false;
		}
		
		for (const s of seriesData) {
			if (Array.isArray(s.data) && s.data.length > 0) {
				for (const value of s.data) {
					if (typeof value === 'number' && value > 0) {
						return true;
					}
				}
			}
		}
		
		return false;
	}, []);
	
	return (
		<BaseChartUI
			options={options}
			series={series}
			chartType={chartType}
			testId={testId}
			hasDataFn={hasData}
			{...restProps}
		/>
	);
});

// Set display name for debugging
BarChartUI.displayName = 'BarChartUI';

// Export default component
export default BarChartUI; 