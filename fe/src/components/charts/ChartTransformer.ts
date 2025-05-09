import { ApexOptions } from 'apexcharts';
import { 
	CHART_COLORS, 
	CHART_COLOR_PALETTE,
	CHART_TYPOGRAPHY, 
	CHART_DEFAULTS, 
	CHART_GRID 
} from '../../theme/chartTheme';
import BaseChartTransformer, { BaseChartConfig } from './BaseChartTransformer';

// Define the expected raw data structure from the SQL query
export interface RawUserAgentData {
	log_day: string; // e.g., '2024-04-10'
	user_agent: string; // This can be either user_agent or crawler_name based on SQL query alias
	count: number;
}

// Define the expected raw data structure specifically for crawler data
export interface RawCrawlerData {
	log_day: string; // e.g., '2024-04-10'
	crawler_name: string;
	count: number;
}

// Generic raw data interface for time series data
export interface GenericTimeSeriesData {
	[key: string]: any;
}

// Define the structure for the transformed data needed by ApexCharts
export interface TransformedChartData {
	options: ApexOptions;
	series: ApexOptions['series'];
}

// Define a proper data point structure for datetime series
export interface DataPoint {
	x: number; // timestamp
	y: number; // value
}

// Define a proper series item structure for the chart
export interface SeriesItem {
	name: string;
	data: DataPoint[];
}

// Configuration options for time series chart transformation
export interface TimeSeriesChartConfig extends BaseChartConfig {
	chartType?: 'area' | 'line' | 'bar';
	stacked?: boolean;
	legendPosition?: 'top' | 'right' | 'bottom' | 'left';
	legendAlign?: 'left' | 'center' | 'right';
	dateFormat?: string;
	showDataLabels?: boolean;
	tooltipSuffix?: string;
	stroke?: {
		curve?: 'smooth' | 'straight' | 'stepline';
		width?: number;
	};
}

// Default chart configuration
const DEFAULT_CHART_CONFIG: ApexOptions = {
	chart: {
		type: 'area',
		stacked: false,
		height: CHART_DEFAULTS.height.large,
		toolbar: { show: true },
		zoom: { enabled: true }
	},
	dataLabels: { enabled: false },
	stroke: { curve: 'smooth', width: 2 },
	xaxis: {
		type: 'datetime',
		title: { text: 'Date' },
		labels: {
			datetimeUTC: false,
			format: 'yyyy-MM-dd',
			rotate: -45,
			hideOverlappingLabels: true,
			style: CHART_TYPOGRAPHY.label
		}
	},
	yaxis: {
		title: { text: 'Value' },
		labels: {
			formatter: (value) => typeof value === 'number' ? value.toFixed(0) : '0',
			style: CHART_TYPOGRAPHY.label
		}
	},
	fill: { opacity: 0.7, type: 'solid' },
	tooltip: {
		// Simplified default - specific formatter handled in transform function
		x: { format: 'MMM dd, yyyy' }
	},
	legend: { 
		position: 'top', 
		horizontalAlign: 'left', 
		offsetY: 10,
		fontSize: CHART_TYPOGRAPHY.label.fontSize
	},
	grid: CHART_GRID,
	colors: CHART_COLOR_PALETTE, // Use consistent color palette
	responsive: [{
		breakpoint: 768,
		options: {
			legend: { position: 'bottom', horizontalAlign: 'center', offsetY: 0 },
			chart: { height: CHART_DEFAULTS.height.medium }
		}
	}]
};

/**
 * Creates a complete date range array with all dates between min and max
 * @param dates Array of date strings
 * @returns Array of all dates in the range
 */
function createCompleteDateRange(dates: string[]): string[] {
	if (dates.length <= 1) return dates;
	
	// Convert to Date objects for easier manipulation
	const dateObjects = dates.map(d => new Date(d));
	const minDate = new Date(Math.min(...dateObjects.map(d => d.getTime())));
	const maxDate = new Date(Math.max(...dateObjects.map(d => d.getTime())));
	
	const result: string[] = [];
	const currentDate = new Date(minDate);
	
	// Loop through all dates in the range
	while (currentDate <= maxDate) {
		result.push(currentDate.toISOString().split('T')[0]);
		currentDate.setDate(currentDate.getDate() + 1);
	}
	
	return result;
}

/**
 * Generic transformer for time series chart data
 * @param data Array of objects to transform
 * @param dateField Field name representing the date
 * @param categoryField Field name representing the series category
 * @param valueField Field name representing the values
 * @param config Chart configuration options
 * @returns Transformed chart data ready for ApexCharts
 */
export function transformGenericTimeSeriesData<T extends Record<string, any>>(
	data: T[],
	dateField: keyof T,
	categoryField: keyof T,
	valueField: keyof T,
	config: Partial<TimeSeriesChartConfig> = {}
): TransformedChartData {
	// Default configuration merged with provided config
	const chartConfig: TimeSeriesChartConfig = {
		title: 'Time Series Chart', 
		xAxisTitle: 'Date',
		yAxisTitle: 'Value',
		chartType: 'area',
		stacked: false,
		height: CHART_DEFAULTS.height.large,
		emptyMessage: "No data available",
		loadingMessage: "Loading data...",
		legendPosition: 'top',
		legendAlign: 'left',
		dateFormat: 'yyyy-MM-dd',
		showDataLabels: false,
		colors: CHART_COLOR_PALETTE, // Use consistent colors
		...config // Override defaults with specific config
	};

	if (!Array.isArray(data) || data.length === 0) {
		// Ensure empty state uses the merged config
		return {
			options: BaseChartTransformer.createEmptyChartOptions(
				chartConfig, 
				chartConfig.chartType || 'area'
			),
			series: []
		};
	}

	const categories = new Set<string>();
	const datesSet = new Set<string>();
	const dataMap: { [category: string]: { [date: string]: number } } = {};

	// Process data in a single pass for efficiency
	for (const item of data) {
		const date = String(item[dateField]);
		const category = String(item[categoryField]);
		const value = Number(item[valueField]);

		if (!date || date.trim() === "") continue;
		
		datesSet.add(date);
		if (category && category.trim() !== "" && category !== "null") {
			categories.add(category);
			if (!dataMap[category]) {
				dataMap[category] = {};
			}
			dataMap[category][date] = value;
		}
	}

	if (datesSet.size === 0 || categories.size === 0) {
		// Ensure empty state uses the merged config
		return {
			options: BaseChartTransformer.createEmptyChartOptions(
				chartConfig,
				chartConfig.chartType || 'area'
			),
			series: []
		};
	}

	// Get a complete array of dates including any missing dates in the range
	const rawDates = Array.from(datesSet).sort();
	const dates = createCompleteDateRange(rawDates);
	const categoryNames = Array.from(categories).sort();

	// Helper function to get previous and next valid values for interpolation
	const getInterpolatedValue = (category: string, dateIndex: number): number => {
		const date = dates[dateIndex];
		
		// If we have actual data for this date, return it
		if (dataMap[category] && dataMap[category][date] !== undefined) {
			return dataMap[category][date];
		}

		// Look for the closest previous value
		let prevValue: number | null = null;
		let prevIndex = dateIndex - 1;
		while (prevIndex >= 0) {
			const prevDate = dates[prevIndex];
			if (dataMap[category] && dataMap[category][prevDate] !== undefined) {
				prevValue = dataMap[category][prevDate];
				break;
			}
			prevIndex--;
		}

		// Look for the closest next value
		let nextValue: number | null = null;
		let nextIndex = dateIndex + 1;
		while (nextIndex < dates.length) {
			const nextDate = dates[nextIndex];
			if (dataMap[category] && dataMap[category][nextDate] !== undefined) {
				nextValue = dataMap[category][nextDate];
				break;
			}
			nextIndex++;
		}

		// Simple interpolation if we have both previous and next values
		if (prevValue !== null && nextValue !== null) {
			const totalSteps = nextIndex - prevIndex;
			const currentStep = dateIndex - prevIndex;
			return prevValue + (nextValue - prevValue) * (currentStep / totalSteps);
		}
		
		// If we only have previous or next, use that
		if (prevValue !== null) return prevValue;
		if (nextValue !== null) return nextValue;
		
		// Default to 0 if we can't interpolate
		return 0;
	};

	const series: SeriesItem[] = categoryNames.map(category => ({
		name: category,
		data: dates.map((date, index) => ({
			x: new Date(date).getTime(),
			y: getInterpolatedValue(category, index)
		}))
	}));

	if (dates.length === 0 || categoryNames.length === 0 || series.length === 0 ||
		series.every(s => s.data.every(d => d.y === 0))) {
		// Ensure empty state uses the merged config
		return {
			options: BaseChartTransformer.createEmptyChartOptions(
				{
					...chartConfig,
					emptyMessage: "All values are zero"
				},
				chartConfig.chartType || 'area'
			),
			series: []
		};
	}

	// Create custom options for time series
	const customOptions: ApexOptions = {
		...DEFAULT_CHART_CONFIG,
		chart: {
			...DEFAULT_CHART_CONFIG.chart,
			type: chartConfig.chartType,
			stacked: chartConfig.stacked,
			height: chartConfig.height
		},
		dataLabels: {
			...DEFAULT_CHART_CONFIG.dataLabels,
			enabled: chartConfig.showDataLabels
		},
		xaxis: {
			...DEFAULT_CHART_CONFIG.xaxis,
			labels: {
				...DEFAULT_CHART_CONFIG.xaxis?.labels,
				format: chartConfig.dateFormat,
				rotateAlways: dates.length > 10, // Dynamic rotation
				datetimeUTC: true // Ensure consistent date handling
			}
		},
		tooltip: {
			...DEFAULT_CHART_CONFIG.tooltip,
			y: {
				formatter: function (val, { seriesIndex, w }) {
					const seriesName = w.globals.seriesNames[seriesIndex];
					const count = typeof val === 'number' ? val : 0;
					const suffix = chartConfig.tooltipSuffix ? ` ${chartConfig.tooltipSuffix}` : '';
					return `${seriesName}: ${Math.round(count)}${suffix}`;
				}
			}
		},
		legend: {
			...DEFAULT_CHART_CONFIG.legend,
			position: chartConfig.legendPosition as any,
			horizontalAlign: chartConfig.legendAlign as any
		}
	};

	// Create chart options with base transformer
	const options = BaseChartTransformer.createDefaultChartOptions(
		chartConfig,
		customOptions
	);

	return { options, series };
}

/**
 * Transforms raw user agent data into a format suitable for ApexCharts
 * @param rawData The raw data array from the SQL query.
 * @param config Additional configuration options
 */
export const transformUserAgentData = (
	rawData: RawUserAgentData[], 
	config: Partial<TimeSeriesChartConfig> = {}
): TransformedChartData => {
	return transformGenericTimeSeriesData<RawUserAgentData>(
		rawData,
		'log_day',
		'user_agent',
		'count',
		{
			// Provide specific defaults for Crawler data here
			title: 'Daily Requests by Crawler Types', // Updated default title
			xAxisTitle: 'Date',
			yAxisTitle: 'Total Request Count',
			chartType: 'area',
			stacked: true,
			emptyMessage: "No Crawler Data Available", // Updated message
			tooltipSuffix: "requests",
			colors: CHART_COLOR_PALETTE, // Use consistent colors
			...config // Allow overriding these specific defaults
		}
	);
};

/**
 * Transforms raw crawler data into a format suitable for ApexCharts
 * This is an alias for transformUserAgentData with crawler-specific defaults
 * @param rawData The raw data array from the SQL query.
 * @param config Additional configuration options
 */
export const transformCrawlerData = transformUserAgentData; 