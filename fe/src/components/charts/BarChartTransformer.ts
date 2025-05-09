import { ApexOptions } from 'apexcharts';
import { 
	CHART_COLORS, 
	CHART_COLOR_PALETTE,
	EXTENDED_COLORS, 
	CHART_TYPOGRAPHY, 
	CHART_DEFAULTS, 
	CHART_GRID 
} from '../../theme/chartTheme';
import BaseChartTransformer, { BaseChartConfig } from './BaseChartTransformer';

// Define the expected raw data structure from the SQL query for top pages
export interface RawTopPagesData {
	page_path: string;
	count: number;
}

// Define a proper series item structure for the bar chart
export interface BarChartSeriesItem {
	name: string;
	data: number[];
}

// Define the structure for the transformed data needed by ApexCharts
export interface TransformedBarChartData {
	options: ApexOptions;
	series: BarChartSeriesItem[];
}

// Configuration options for bar chart transformation
export interface BarChartConfig extends BaseChartConfig {
	horizontal?: boolean;
	legendPosition?: 'top' | 'right' | 'bottom' | 'left';
	legendAlign?: 'left' | 'center' | 'right';
	showDataLabels?: boolean;
	limit?: number;
	sortDirection?: 'asc' | 'desc';
	distributed?: boolean;
	fontFamily?: string;
}

// Default chart configuration
const DEFAULT_BAR_CHART_CONFIG: ApexOptions = {
	chart: {
		type: 'bar',
		height: CHART_DEFAULTS.height.medium,
		toolbar: { show: true },
		zoom: { enabled: false }
	},
	plotOptions: {
		bar: {
			horizontal: false,
			columnWidth: '55%',
			borderRadius: CHART_DEFAULTS.borderRadius,
			distributed: false,
			dataLabels: {
				position: 'top'
			}
		}
	},
	dataLabels: { 
		enabled: true,
		formatter: function(val) {
			return val.toString();
		},
		offsetY: -20,
		style: CHART_TYPOGRAPHY.dataLabel
	},
	stroke: { 
		show: true,
		width: 2,
		colors: ['transparent']
	},
	xaxis: {
		categories: [],
		title: { text: 'Categories' },
		labels: {
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
	fill: { 
		opacity: CHART_DEFAULTS.opacity
	},
	tooltip: {
		y: {
			formatter: function(val) {
				return val.toString();
			}
		}
	},
	legend: { 
		show: false,  // Generally not needed for single series bar charts
		position: 'top',
		horizontalAlign: 'left',
		offsetY: 10
	},
	grid: CHART_GRID,
	colors: CHART_COLOR_PALETTE, // Use consistent color palette
	responsive: [{
		breakpoint: 768,
		options: {
			plotOptions: {
				bar: {
					horizontal: true  // Switch to horizontal bars on mobile
				}
			},
			legend: { 
				position: 'bottom',
				horizontalAlign: 'center',
				offsetY: 0
			},
			chart: { height: CHART_DEFAULTS.height.small }
		}
	}]
};

/**
 * Transforms raw top pages data into a format suitable for a bar chart
 * @param rawData The raw data array from the SQL query.
 * @param config The chart configuration options
 * @returns Transformed chart data ready for ApexCharts
 */
export const transformTopPagesData = (
	rawData: RawTopPagesData[],
	config: Partial<BarChartConfig> = {}
): TransformedBarChartData => {
	// Default configuration merged with provided config
	const chartConfig: BarChartConfig = {
		title: 'Top Pages',
		xAxisTitle: 'Page',
		yAxisTitle: 'Visits',
		horizontal: true,
		height: CHART_DEFAULTS.height.medium,
		emptyMessage: "No page data available",
		loadingMessage: "Loading data...",
		legendPosition: 'top',
		legendAlign: 'left',
		showDataLabels: true,
		limit: 5,
		sortDirection: 'desc',
		distributed: true,
		tooltipSuffix: 'visits',
		...config
	};

	if (!Array.isArray(rawData) || rawData.length === 0) {
		return {
			options: BaseChartTransformer.createEmptyChartOptions(
				chartConfig,
				'bar'
			),
			series: []
		};
	}

	// Sort and limit the data
	const sortedData = [...rawData].sort((a, b) => {
		return chartConfig.sortDirection === 'desc' 
			? b.count - a.count 
			: a.count - b.count;
	}).slice(0, chartConfig.limit);

	if (sortedData.length === 0) {
		return {
			options: BaseChartTransformer.createEmptyChartOptions(
				chartConfig,
				'bar'
			),
			series: []
		};
	}

	// Process page paths to make them more readable
	const processPath = (path: string): string => {
		// If path is just "/", return "Homepage"
		if (path === "/" || path === "") return "Homepage";
		
		// For horizontal charts, we may want to keep more of the path to ensure it's readable
		const truncateLength = chartConfig.horizontal ? 30 : 20;
		
		// Truncate very long paths
		if (path.length > truncateLength) {
			return path.substring(0, truncateLength - 3) + "...";
		}
		
		return path;
	};

	// Extract categories and data values with processed paths
	const categories = sortedData.map(item => processPath(item.page_path));
	const values = sortedData.map(item => item.count);

	// Create series data for the chart
	const series: BarChartSeriesItem[] = [
		{
			name: chartConfig.yAxisTitle || 'Visits',
			data: values
		}
	];

	// Create custom options for the bar chart
	const customOptions: ApexOptions = {
		...DEFAULT_BAR_CHART_CONFIG,
		chart: {
			...DEFAULT_BAR_CHART_CONFIG.chart,
			height: chartConfig.height
		},
		plotOptions: {
			...DEFAULT_BAR_CHART_CONFIG.plotOptions,
			bar: {
				...DEFAULT_BAR_CHART_CONFIG.plotOptions?.bar,
				horizontal: chartConfig.horizontal,
				distributed: chartConfig.distributed
			}
		},
		dataLabels: {
			...DEFAULT_BAR_CHART_CONFIG.dataLabels,
			enabled: chartConfig.showDataLabels
		},
		// For horizontal bar charts in ApexCharts, we still define categories on xaxis
		// but they will be shown on the yaxis
		xaxis: {
			...DEFAULT_BAR_CHART_CONFIG.xaxis,
			categories: categories,
			title: { 
				text: chartConfig.horizontal ? chartConfig.yAxisTitle : chartConfig.xAxisTitle 
			},
			labels: {
				show: true,
				style: CHART_TYPOGRAPHY.label,
				maxHeight: 120
			}
		},
		// Set the axis titles correctly
		yaxis: {
			...DEFAULT_BAR_CHART_CONFIG.yaxis,
			title: { 
				text: chartConfig.horizontal ? chartConfig.xAxisTitle : chartConfig.yAxisTitle 
			},
			labels: {
				style: { 
					...CHART_TYPOGRAPHY.label,
					// Increase font size a bit for horizontal bar labels to make them more readable
					fontSize: chartConfig.horizontal ? '13px' : CHART_TYPOGRAPHY.label.fontSize
				},
				minWidth: chartConfig.horizontal ? 200 : 150, // More space for labels in horizontal mode
				maxWidth: chartConfig.horizontal ? 300 : undefined
			}
		},
		tooltip: {
			...DEFAULT_BAR_CHART_CONFIG.tooltip,
			y: {
				formatter: function(val) {
					return `${val} ${chartConfig.tooltipSuffix || ''}`.trim();
				}
			},
			x: {
				formatter: function(val): string {
					// For horizontal charts, ApexCharts will handle this correctly with the categories
					if (typeof val === 'number' && categories[val - 1]) {
						return categories[val - 1];
					}
					return String(val);
				}
			}
		},
		colors: chartConfig.colors || CHART_COLOR_PALETTE
	};

	// Create chart options using the base transformer
	const options = BaseChartTransformer.createDefaultChartOptions(
		chartConfig,
		customOptions
	);

	return { options, series };
}; 