import { ApexOptions } from 'apexcharts';
import { 
	CHART_COLORS, 
	CHART_COLOR_PALETTE,
	CHART_TYPOGRAPHY, 
	CHART_DEFAULTS, 
	CHART_GRID 
} from '../../theme/chartTheme';
import BaseChartTransformer, { BaseChartConfig } from './BaseChartTransformer';

// Raw data structure from SQL query
export interface RawStatusCodeData {
	status_group: string;
	count: number;
}

// Generic interface for raw data with category and value
export interface GenericColumnData {
	[key: string]: any;
}

// Data point structure for category-based column charts
export interface CategoryDataPoint {
	x: string; // category name
	y: number; // value
	color?: string; // optional color override
}

// Series item for column charts
export interface ColumnSeriesItem {
	name: string;
	data: CategoryDataPoint[];
}

// Transformed data structure for ApexCharts
export interface TransformedColumnChartData {
	options: ApexOptions;
	series: ColumnSeriesItem[];
}

// Configuration options for chart transformation
export interface ColumnChartConfig extends BaseChartConfig {
	seriesName: string;
	categoryOrder?: string[];
	defaultColor?: string;
	tooltipSuffix?: string; // Text to append to tooltip values (e.g., "requests")
}

// Default chart configuration
const DEFAULT_CHART_CONFIG: ApexOptions = {
	chart: {
		type: 'bar',
		height: CHART_DEFAULTS.height.medium,
		toolbar: { show: true },
		zoom: { enabled: false }
	},
	plotOptions: {
		bar: {
			distributed: true,
			borderRadius: CHART_DEFAULTS.borderRadius,
			horizontal: false,
			columnWidth: '60%',
		}
	},
	dataLabels: {
		enabled: true,
		formatter: (val) => 
			typeof val === 'number' && val > 0 ? val.toString() : '',
		offsetY: -20,
		style: CHART_TYPOGRAPHY.dataLabel
	},
	legend: {
		show: false
	},
	xaxis: {
		title: { text: 'Category' },
		labels: {
			rotate: -45,
			style: CHART_TYPOGRAPHY.label
		}
	},
	yaxis: {
		title: { text: 'Value' },
		labels: {
			formatter: (value) => 
				typeof value === 'number' ? value.toFixed(0) : '0',
			style: CHART_TYPOGRAPHY.label
		}
	},
	tooltip: {
		y: {
			formatter: (val) => `${val}`
		}
	},
	grid: CHART_GRID,
	colors: CHART_COLOR_PALETTE, // Use consistent color palette
	responsive: [{
		breakpoint: 768,
		options: {
			chart: { height: CHART_DEFAULTS.height.small },
			xaxis: { labels: { rotate: -65 } }
		}
	}, {
		breakpoint: 480,
		options: {
			chart: { height: CHART_DEFAULTS.height.small - 50 },
			plotOptions: { bar: { columnWidth: '80%' } },
			dataLabels: { offsetY: -15, style: { fontSize: '10px' } },
			xaxis: { labels: { rotate: -90 } }
		}
	}]
};

/**
 * Transforms raw status code data into a format for ApexCharts column chart
 * This is a convenience wrapper around transformGenericColumnData for status code data
 * @param rawData Raw status code data from SQL query
 * @param title Chart title
 * @param config Additional configuration options
 * @returns Transformed chart data ready for ApexCharts
 */
export const transformStatusCodeData = (
	rawData: RawStatusCodeData[],
	title: string,
	config: Partial<ColumnChartConfig> = {}
): TransformedColumnChartData => {
	return transformGenericColumnData<RawStatusCodeData>(
		rawData,
		'status_group',
		'count',
		{
			title,
			seriesName: 'Request Count',
			xAxisTitle: 'Status Code Group',
			yAxisTitle: 'Total Request Count',
			emptyMessage: "No status code data available",
			loadingMessage: "Loading status code data...",
			tooltipSuffix: "requests",
			defaultColor: CHART_COLORS.primary,
			colors: CHART_COLOR_PALETTE, // Use consistent colors
			...config
		}
	);
};

/**
 * Generic transformer for column chart data
 * @param data Array of objects to transform
 * @param categoryField Field name to use for x-axis categories
 * @param valueField Field name to use for y-axis values
 * @param config Additional configuration options
 * @returns Transformed chart data ready for ApexCharts
 */
export function transformGenericColumnData<T extends Record<string, any>>(
	data: T[],
	categoryField: keyof T,
	valueField: keyof T,
	config: Partial<ColumnChartConfig> = {}
): TransformedColumnChartData {
	// Default configuration
	const chartConfig: ColumnChartConfig = {
		title: config.title || 'Column Chart',
		seriesName: config.seriesName || 'Value',
		xAxisTitle: config.xAxisTitle || 'Category',
		yAxisTitle: config.yAxisTitle || 'Value',
		categoryOrder: config.categoryOrder,
		colorMap: config.colorMap,
		defaultColor: config.defaultColor || CHART_COLORS.primary,
		emptyMessage: config.emptyMessage || "No data available",
		loadingMessage: config.loadingMessage || "Loading data...",
		tooltipSuffix: config.tooltipSuffix,
		colors: config.colors || CHART_COLOR_PALETTE
	};

	// Handle empty data
	if (!Array.isArray(data) || data.length === 0) {
		return {
			options: BaseChartTransformer.createEmptyChartOptions(
				chartConfig,
				'bar'
			),
			series: []
		};
	}

	// Process and sort the data
	const processedData = BaseChartTransformer.sortDataByOrder(
		data, 
		categoryField, 
		chartConfig.categoryOrder
	);
	
	// Extract categories and create data points
	const categories = processedData.map(item => String(item[categoryField]));
	const dataPoints: CategoryDataPoint[] = processedData.map(item => ({
		x: String(item[categoryField]),
		y: Number(item[valueField]),
		color: chartConfig.colorMap?.[String(item[categoryField])] || chartConfig.defaultColor
	}));

	// Check if all values are zero
	if (dataPoints.every(d => d.y === 0)) {
		const emptyOptions = BaseChartTransformer.createEmptyChartOptions(
			{
				...chartConfig,
				emptyMessage: "All values are zero"
			},
			'bar'
		);
		
		return {
			options: emptyOptions,
			series: []
		};
	}

	// Create custom colors array if using colorMap
	let colors = chartConfig.colors;
	if (chartConfig.colorMap) {
		colors = BaseChartTransformer.getColors(categories, chartConfig.colorMap, chartConfig.colors);
	}

	// Create chart options
	const options = BaseChartTransformer.createDefaultChartOptions(
		{
			...chartConfig,
			colors
		},
		{
			...DEFAULT_CHART_CONFIG,
			xaxis: {
				...DEFAULT_CHART_CONFIG.xaxis,
				categories
			}
		}
	);

	return {
		options,
		series: [{
			name: chartConfig.seriesName,
			data: dataPoints
		}]
	};
} 