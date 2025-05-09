import { ApexOptions } from 'apexcharts';
import { 
	CHART_COLORS, 
	CHART_COLOR_PALETTE,
	CHART_TYPOGRAPHY, 
	CHART_DEFAULTS, 
	COLOR_MAPS 
} from '../../theme/chartTheme';
import BaseChartTransformer, { BaseChartConfig } from './BaseChartTransformer';

// Raw data structure for pie/donut chart
export interface RawDonutData {
	label: string;
	value: number;
	percentage?: number; // Optional percentage that can be pre-calculated
}

// Generic interface for raw data
export interface GenericDonutData {
	[key: string]: any;
}

// Series data for donut charts
export type DonutSeries = number[];

// Labels for donut charts
export type DonutLabels = string[];

// Transformed data structure for ApexCharts
export interface TransformedDonutChartData {
	options: ApexOptions;
	series: DonutSeries;
}

// Configuration options for chart transformation
export interface DonutChartConfig extends BaseChartConfig {
	customOptions?: Partial<ApexOptions>; // Additional custom options
	enableDataLabels?: boolean;
	donutSize?: string; // Size of the donut hole (e.g., '65%')
	labelOrder?: string[]; // Order for labels
}

// Default chart configuration
const DEFAULT_CHART_CONFIG: ApexOptions = {
	chart: {
		type: 'donut',
		height: 350,
		toolbar: { show: false }
	},
	plotOptions: {
		pie: {
			donut: {
				size: '65%',
				labels: {
					show: true,
					name: {
						show: true,
						fontSize: '16px',
						fontWeight: 600
					},
					value: {
						show: true,
						fontSize: '20px',
						fontWeight: 400,
						formatter: (val) => val.toString()
					},
					total: {
						show: true,
						label: 'Total',
						formatter: (w) => {
							const total = w.globals.seriesTotals.reduce((a, b) => a + b, 0);
							return total.toString();
						}
					}
				}
			}
		}
	},
	dataLabels: {
		enabled: true,
		formatter: (val: number) => `${val.toFixed(1)}%`
	},
	legend: {
		position: 'bottom',
		horizontalAlign: 'center',
		fontSize: CHART_TYPOGRAPHY.label.fontSize
	},
	responsive: [{
		breakpoint: 768,
		options: {
			chart: { height: 320 },
			legend: { position: 'bottom' }
		}
	}, {
		breakpoint: 480,
		options: {
			chart: { height: 280 },
			legend: { position: 'bottom' }
		}
	}],
	stroke: {
		width: 0
	},
	tooltip: {
		enabled: true,
		fillSeriesColor: false,
		style: {
			fontSize: '14px'
		},
		y: {
			formatter: (val) => `${val.toLocaleString()}`
		}
	},
	colors: CHART_COLOR_PALETTE // Use consistent color palette
};

/**
 * Transforms raw traffic source data into a format for ApexCharts donut chart
 * This is a convenience wrapper around transformGenericDonutData for traffic source data
 * @param rawData Raw traffic source data
 * @param title Chart title
 * @param config Additional configuration options
 * @returns Transformed chart data ready for ApexCharts
 */
export const transformTrafficSourceData = (
	rawData: RawDonutData[],
	title: string,
	config: Partial<DonutChartConfig> = {}
): TransformedDonutChartData => {
	return transformGenericDonutData<RawDonutData>(
		rawData,
		'label',
		'value',
		{
			title,
			colors: CHART_COLOR_PALETTE,
			colorMap: COLOR_MAPS.trafficSources,
			emptyMessage: "No traffic source data available",
			loadingMessage: "Loading traffic source data...",
			tooltipSuffix: "of traffic",
			labelOrder: ['Human', 'Bot', 'LLM'],
			...config
		}
	);
};

/**
 * Generic transformer for donut chart data
 * @param data Array of objects to transform
 * @param labelField Field name to use for labels
 * @param valueField Field name to use for values
 * @param config Additional configuration options
 * @returns Transformed chart data ready for ApexCharts
 */
export function transformGenericDonutData<T extends Record<string, any>>(
	data: T[],
	labelField: keyof T,
	valueField: keyof T,
	config: Partial<DonutChartConfig> = {}
): TransformedDonutChartData {
	// Default configuration
	const chartConfig: DonutChartConfig = {
		title: config.title || 'Donut Chart',
		colors: config.colors || CHART_COLOR_PALETTE,
		colorMap: config.colorMap,
		emptyMessage: config.emptyMessage || "No data available",
		loadingMessage: config.loadingMessage || "Loading data...",
		tooltipSuffix: config.tooltipSuffix,
		customOptions: config.customOptions || {},
		enableDataLabels: config.enableDataLabels !== undefined ? config.enableDataLabels : true,
		donutSize: config.donutSize || '65%',
		labelOrder: config.labelOrder
	};

	// Handle empty data
	if (!Array.isArray(data) || data.length === 0) {
		return {
			options: BaseChartTransformer.createEmptyChartOptions(
				chartConfig,
				'donut'
			),
			series: []
		};
	}

	// Process and sort the data
	const processedData = BaseChartTransformer.sortDataByOrder(
		data, 
		labelField, 
		chartConfig.labelOrder
	);
	
	// Extract labels and values
	const labels = processedData.map(item => String(item[labelField]));
	const values = processedData.map(item => Number(item[valueField]));
	
	// Calculate percentage values if tooltipSuffix contains '%'
	const total = values.reduce((sum, value) => sum + value, 0);
	
	// Check if all values are zero
	if (total === 0) {
		return {
			options: BaseChartTransformer.createEmptyChartOptions(
				{
					...chartConfig,
					emptyMessage: "All values are zero"
				},
				'donut'
			),
			series: []
		};
	}

	// Get colors based on colorMap or default
	const colors = chartConfig.colorMap ? 
		BaseChartTransformer.getColors(labels, chartConfig.colorMap, chartConfig.colors) : 
		chartConfig.colors;

	// Configure data labels
	const dataLabels = chartConfig.enableDataLabels 
		? { 
			enabled: true, 
			formatter: (val: number) => `${val.toFixed(1)}%` 
		}
		: { enabled: false };

	// Configure donut size
	const donutSize = chartConfig.donutSize || '65%';

	// Prepare custom options with donut specific settings
	const customOptions: ApexOptions = {
		...DEFAULT_CHART_CONFIG,
		colors,
		labels,
		dataLabels,
		plotOptions: {
			...DEFAULT_CHART_CONFIG.plotOptions,
			pie: {
				...DEFAULT_CHART_CONFIG.plotOptions?.pie,
				donut: {
					...DEFAULT_CHART_CONFIG.plotOptions?.pie?.donut,
					size: donutSize
				}
			}
		},
		...chartConfig.customOptions
	};

	// Create chart options using the base transformer
	const options = BaseChartTransformer.createDefaultChartOptions(
		{
			...chartConfig,
			colors
		},
		customOptions
	);

	return {
		options,
		series: values
	};
} 