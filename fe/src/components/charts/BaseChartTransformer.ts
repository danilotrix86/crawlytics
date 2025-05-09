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

// Common interface for transformer configuration
export interface BaseChartConfig {
	title: string;
	emptyMessage?: string;
	loadingMessage?: string;
	xAxisTitle?: string;
	yAxisTitle?: string;
	tooltipSuffix?: string;
	colors?: string[];
	colorMap?: Record<string, any>;
	height?: number;
}

/**
 * Base chart transformer with common utility methods
 */
export class BaseChartTransformer {
	/**
	 * Sort data by a specific order array
	 * @param data Array of data to sort
	 * @param orderField Field to use for ordering
	 * @param orderArray Array of values in desired order
	 * @returns Sorted data array
	 */
	static sortDataByOrder<T extends Record<string, any>>(
		data: T[],
		orderField: keyof T,
		orderArray?: string[]
	): T[] {
		if (!orderArray?.length) return [...data];

		return [...data].sort((a, b) => {
			const aValue = String(a[orderField]);
			const bValue = String(b[orderField]);
			const indexA = orderArray.indexOf(aValue);
			const indexB = orderArray.indexOf(bValue);

			// Items not in the order array go to the end
			if (indexA === -1 && indexB === -1) return 0;
			if (indexA === -1) return 1;
			if (indexB === -1) return -1;
			return indexA - indexB;
		});
	}

	/**
	 * Creates a tooltip formatter function based on suffix
	 * @param tooltipSuffix Optional text to append to values
	 * @returns Formatter function
	 */
	static createTooltipFormatter(tooltipSuffix?: string): (val: any, opts?: any) => string {
		return tooltipSuffix
			? (val: any, opts?: any) => `${val} ${tooltipSuffix}`
			: (val: any) => `${val}`;
	}

	/**
	 * Creates empty chart configuration for consistent handling
	 * @param config Chart configuration
	 * @param chartType Chart type
	 * @returns Empty chart configuration
	 */
	static createEmptyChartOptions(
		config: BaseChartConfig,
		chartType: ApexChartType = 'line'
	): ApexOptions {
		return {
			chart: {
				type: chartType,
				height: config.height || CHART_DEFAULTS.height.medium,
			},
			title: {
				text: config.emptyMessage || 'No Data Available',
				align: 'center',
				style: { fontSize: '16px', color: '#9CA3AF' },
				offsetY: (config.height || CHART_DEFAULTS.height.medium) / 2 - 30
			},
			xaxis: {
				type: 'category',
				title: { text: config.xAxisTitle },
				labels: { show: false },
				axisBorder: { show: false },
				axisTicks: { show: false }
			},
			yaxis: {
				// Ensuring yaxis is a single object, not an array
				title: { text: config.yAxisTitle },
				labels: { show: false }
			},
			grid: { show: false },
			noData: {
				text: config.emptyMessage || "No data available",
				align: 'center',
				verticalAlign: 'middle',
				style: { color: '#9CA3AF', fontSize: '14px' }
			},
			colors: config.colors || CHART_COLOR_PALETTE,
		};
	}

	/**
	 * Get colors based on colorMap or default colors
	 * @param labels Array of labels/categories
	 * @param colorMap Color mapping by label
	 * @param defaultColors Default color palette
	 * @returns Array of colors
	 */
	static getColors(
		labels: string[],
		colorMap?: Record<string, string>,
		defaultColors: string[] = CHART_COLOR_PALETTE
	): string[] {
		if (colorMap) {
			return labels.map(label => colorMap[label] || defaultColors[0]);
		}
		return defaultColors;
	}

	/**
	 * Creates default chart options with sensible defaults
	 * @param config Base chart configuration
	 * @param defaultOptions Default options to extend
	 * @returns Merged ApexOptions
	 */
	static createDefaultChartOptions(
		config: BaseChartConfig,
		defaultOptions: ApexOptions = {}
	): ApexOptions {
		// Create a safe yaxis object
		const yaxis = typeof defaultOptions.yaxis === 'object' && !Array.isArray(defaultOptions.yaxis)
			? {
				...defaultOptions.yaxis,
				title: {
					...(defaultOptions.yaxis?.title || {}),
					text: config.yAxisTitle
				}
			}
			: { title: { text: config.yAxisTitle } };

		// Create safe tooltip formatter
		let tooltipY;
		if (config.tooltipSuffix) {
			const formatter = (val: any) => `${val} ${config.tooltipSuffix}`;
			tooltipY = { formatter };
		} else if (defaultOptions.tooltip?.y && !Array.isArray(defaultOptions.tooltip.y)) {
			tooltipY = defaultOptions.tooltip.y;
		} else {
			tooltipY = { formatter: (val: any) => `${val}` };
		}

		return {
			...defaultOptions,
			title: {
				text: config.title,
				align: 'left',
				style: CHART_TYPOGRAPHY.title
			},
			colors: config.colors || CHART_COLOR_PALETTE,
			xaxis: {
				...defaultOptions.xaxis,
				title: {
					...(defaultOptions.xaxis?.title || {}),
					text: config.xAxisTitle
				}
			},
			yaxis,
			tooltip: {
				...defaultOptions.tooltip,
				y: tooltipY
			},
		};
	}
}

export default BaseChartTransformer; 