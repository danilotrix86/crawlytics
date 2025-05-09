import { useCallback } from 'react';
import { ApexOptions } from 'apexcharts';
import {
	CHART_COLORS,
	CHART_COLOR_PALETTE,
	CHART_TYPOGRAPHY,
	CHART_DEFAULTS,
	CHART_GRID
} from '../../theme/chartTheme';

// Chart type allowed by ApexCharts
type ApexChartType = 'line' | 'area' | 'bar' | 'pie' | 'donut' | 'radialBar' |
	'scatter' | 'bubble' | 'heatmap' | 'candlestick' | 'boxPlot' |
	'radar' | 'polarArea' | 'rangeBar' | 'rangeArea' | 'treemap';

// Generic type for empty chart data return
interface EmptyChartData<T> {
	options: ApexOptions;
	series: T;
}

/**
 * Custom hook providing utility functions for chart components
 */
export function useChartUtils() {
	/**
	 * Creates empty chart data with proper configuration
	 * Generic to handle different series types
	 */
	// REMOVED: createEmptyChartData function

	/**
	 * Generic function to sort data by category/label order
	 */
	// REMOVED: sortDataByOrder function

	/**
	 * Creates tooltip formatter function
	 */
	// REMOVED: createTooltipFormatter function

	// Data validation utility functions

	// Checks if column/bar chart data is valid
	const hasColumnData = useCallback((series: any[]): boolean => {
		return Array.isArray(series) &&
			series.length > 0 &&
			series.some(s => Array.isArray(s.data) &&
				s.data.some((d: any) => d && d.y > 0)
			);
	}, []);

	// Checks if donut/pie chart data is valid
	const hasDonutData = useCallback((series: number[]): boolean => {
		return Array.isArray(series) && series.some(value => value > 0);
	}, []);

	// Checks if time series chart data is valid
	const hasTimeSeriesData = useCallback((series: any[]): boolean => {
		return Array.isArray(series) &&
			series.length > 0 &&
			series.some(s => Array.isArray(s.data) &&
				s.data.length > 0 &&
				s.data.some((d: any) => d && d.y > 0)
			);
	}, []);

	// Checks if heatmap chart data is valid
	const hasHeatmapData = useCallback((series: any[]): boolean => {
		return Array.isArray(series) &&
			series.length > 0 &&
			series.some(s => Array.isArray(s.data) &&
				s.data.length > 0 &&
				s.data.some((d: any) => d && d.y != null)
			);
	}, []);

	// Checks if bar chart data is valid
	const hasBarData = useCallback((series: any[]): boolean => {
		return Array.isArray(series) && 
			series.length > 0 && 
			series.some(s => Array.isArray(s.data) && 
				s.data.length > 0 && 
				// Check for numeric data as bar charts often use plain number arrays
				s.data.some((value: any) => typeof value === 'number' ? value > 0 : value?.y > 0)
			);
	}, []);

	return {
		// REMOVED: createEmptyChartData,
		// REMOVED: sortDataByOrder,
		// REMOVED: createTooltipFormatter,
		hasColumnData,
		hasDonutData,
		hasTimeSeriesData,
		hasHeatmapData,
		hasBarData
	};
}

export default useChartUtils; 