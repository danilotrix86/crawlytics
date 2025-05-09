import React from 'react';
import { HeatmapSeries } from './HeatmapChartTransformer';
import BaseChartUI, { BaseChartUIProps } from './BaseChartUI';
import useChartUtils from './useChartUtils';

// Define props for the UI component
export interface HeatmapChartUIProps
	extends Omit<BaseChartUIProps, 'series' | 'hasDataFn'> {
	series: HeatmapSeries[];
}

// Memoized component for better performance
export const HeatmapChartUI = React.memo(function HeatmapChartUI({
	options,
	series,
	chartType = 'heatmap',
	testId = 'heatmap-chart',
	...restProps
}: HeatmapChartUIProps): React.ReactElement {
	const { hasHeatmapData } = useChartUtils();
	
	return (
		<BaseChartUI
			options={options}
			series={series}
			chartType={chartType}
			testId={testId}
			hasDataFn={hasHeatmapData}
			{...restProps}
		/>
	);
});

// Set display name for debugging
HeatmapChartUI.displayName = 'HeatmapChartUI';

// Optional: Default export
export default HeatmapChartUI; 