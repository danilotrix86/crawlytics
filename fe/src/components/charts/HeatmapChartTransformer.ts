import { ApexOptions } from 'apexcharts';
import {
	CHART_COLOR_PALETTE,
	CHART_TYPOGRAPHY,
	CHART_DEFAULTS,
	CHART_GRID
} from '../../theme/chartTheme';
import BaseChartTransformer, { BaseChartConfig } from './BaseChartTransformer';

// Define the expected raw data structure for heatmap
export interface RawHeatmapData {
	x_category: string; // e.g., hour of the day ('00', '01', ...)
	y_category: string; // e.g., day of the week ('Sunday', 'Monday', ...)
	value: number;      // e.g., count
}

// Define a proper data point structure for heatmap series
export interface HeatmapPoint {
	x: string; // Category for the X-axis
	y: number; // Value determining the color intensity
}

// Define a proper series item structure for the heatmap chart
export interface HeatmapSeries {
	name: string;      // Category for the Y-axis (row name)
	data: HeatmapPoint[];
}

// Define the structure for the transformed data needed by ApexCharts Heatmap
export interface TransformedHeatmapData {
	options: ApexOptions;
	series: HeatmapSeries[];
}

// Configuration options for heatmap chart transformation
export interface HeatmapChartConfig extends BaseChartConfig {
	// colorScaleRanges?: ApexAxisChartSeries | ApexNonAxisChartSeries | ApexAnnotations | ApexResponsive; 
    colorScaleRanges?: any; // Simplified type for color scale ranges
	showDataLabels?: boolean;
	distributed?: boolean; // From ApexCharts heatmap options
    radius?: number; // Cell radius
	legendPosition?: 'top' | 'right' | 'bottom' | 'left';
	legendAlign?: 'left' | 'center' | 'right';
}

// Default chart configuration for Heatmap
const DEFAULT_HEATMAP_CONFIG: ApexOptions = {
	chart: {
		type: 'heatmap',
		height: CHART_DEFAULTS.height.medium,
		toolbar: { show: true },
		zoom: { enabled: false } // Zoom often not needed for categorical heatmaps
	},
	dataLabels: { enabled: false }, // Usually false for heatmaps unless specified
	stroke: { width: 1, colors: ['#fff'] }, // Add border to cells
	xaxis: {
		type: 'category',
		labels: {
			rotate: -45,
			hideOverlappingLabels: true,
			style: CHART_TYPOGRAPHY.label
		},
		title: { text: undefined }, // Often omitted
	},
	yaxis: {
		labels: {
			style: CHART_TYPOGRAPHY.label
		},
		title: { text: undefined } // Often omitted
	},
	tooltip: {
		y: { // Default tooltip formatter
			formatter: function (value) {
				return String(value); // Basic value display
			}
		}
	},
	legend: {
		position: 'top',
		horizontalAlign: 'left',
		offsetY: 10,
		fontSize: CHART_TYPOGRAPHY.label.fontSize,
		itemMargin: {
			horizontal: 10,
			vertical: 5
		},
	},
	grid: {
        ...CHART_GRID,
        padding: {
            right: 20 // Add padding for y-axis labels if long
        }
    },
	plotOptions: {
		heatmap: {
			shadeIntensity: 0.5,
			radius: 0, // Square cells by default
			enableShades: true,
            distributed: false, // Default to non-distributed color scale per series
			colorScale: {
				ranges: [] // Default to empty, use palette colors per series or define ranges in config
			}
		} as any // Assert the whole heatmap object type
	},
	colors: CHART_COLOR_PALETTE, // Fallback if no colorScaleRanges are defined
	responsive: [{
		breakpoint: 768,
		options: {
			chart: { height: CHART_DEFAULTS.height.small },
            xaxis: { labels: { rotate: -90 } },
			legend: { position: 'bottom', horizontalAlign: 'center', offsetY: 0 },
		}
	}]
};

/**
 * Generic transformer for heatmap chart data
 * @param data Array of objects to transform { x_category, y_category, value }
 * @param config Chart configuration options
 * @param xOrder Optional array to enforce specific order for x-axis categories
 * @param yOrder Optional array to enforce specific order for y-axis categories (rows)
 * @returns Transformed chart data ready for ApexCharts Heatmap
 */
export function transformGenericHeatmapData(
	data: RawHeatmapData[],
	config: Partial<HeatmapChartConfig> = {},
	xOrder: string[] = [],
	yOrder: string[] = []
): TransformedHeatmapData {
	// Default configuration merged with provided config
	const chartConfig: HeatmapChartConfig = {
		title: 'Heatmap Chart',
		height: CHART_DEFAULTS.height.medium,
		emptyMessage: "No data available",
		loadingMessage: "Loading data...",
		legendPosition: 'top',
		legendAlign: 'left',
		showDataLabels: false,
        distributed: false,
        radius: 0,
		colors: CHART_COLOR_PALETTE,
		...config // Override defaults with specific config
	};

	if (!Array.isArray(data) || data.length === 0) {
		return {
			options: BaseChartTransformer.createEmptyChartOptions(
				chartConfig,
				'heatmap'
			),
			series: []
		};
	}

	const dataMap: { [yCat: string]: { [xCat: string]: number } } = {};
	const xCategoriesSet = new Set<string>();
	const yCategoriesSet = new Set<string>();

	// Process data
	for (const item of data) {
		const xCat = String(item.x_category);
		const yCat = String(item.y_category);
		const value = Number(item.value);

		if (!xCat || xCat.trim() === "" || !yCat || yCat.trim() === "") continue;

		xCategoriesSet.add(xCat);
		yCategoriesSet.add(yCat);

		if (!dataMap[yCat]) {
			dataMap[yCat] = {};
		}
		dataMap[yCat][xCat] = value;
	}

	if (xCategoriesSet.size === 0 || yCategoriesSet.size === 0) {
		return {
			options: BaseChartTransformer.createEmptyChartOptions(
				chartConfig,
				'heatmap'
			),
			series: []
		};
	}

	// Determine order of categories
    const finalXCategories = xOrder.length > 0 ? xOrder : Array.from(xCategoriesSet).sort();
	const finalYCategories = yOrder.length > 0 ? yOrder : Array.from(yCategoriesSet).sort();

	// Build series data, ensuring all x categories exist for each y category
	const series: HeatmapSeries[] = finalYCategories.map(yCat => ({
		name: yCat,
		data: finalXCategories.map(xCat => ({
			x: xCat,
			y: (dataMap[yCat] && dataMap[yCat][xCat]) || 0 // Default to 0 if no data point exists
		}))
	}));

    // Check if all values are zero after processing
    const allZero = series.every(s => s.data.every(d => d.y === 0));
	if (finalXCategories.length === 0 || finalYCategories.length === 0 || series.length === 0 || allZero) {
		return {
			options: BaseChartTransformer.createEmptyChartOptions(
				{
					...chartConfig,
					emptyMessage: "All values are zero"
				},
				'heatmap'
			),
			series: []
		};
	}

	// Prepare custom chart options
    const customOptions: ApexOptions = {
        ...DEFAULT_HEATMAP_CONFIG,
        xaxis: {
            ...DEFAULT_HEATMAP_CONFIG.xaxis,
            categories: finalXCategories,
            title: { ...DEFAULT_HEATMAP_CONFIG.xaxis?.title, text: chartConfig.xAxisTitle }
        },
        // Handle yaxis title with proper type safety
        yaxis: {
            labels: { style: CHART_TYPOGRAPHY.label },
            // Using direct object rather than attempting to merge
            title: { text: chartConfig.yAxisTitle } 
        },
        dataLabels: {
            ...DEFAULT_HEATMAP_CONFIG.dataLabels,
            enabled: chartConfig.showDataLabels
        },
        plotOptions: {
            ...DEFAULT_HEATMAP_CONFIG.plotOptions,
            heatmap: {
                ...DEFAULT_HEATMAP_CONFIG.plotOptions?.heatmap,
                radius: chartConfig.radius,
                distributed: chartConfig.distributed,
                colorScale: {
                    ...(DEFAULT_HEATMAP_CONFIG.plotOptions?.heatmap as any)?.colorScale,
                    ranges: chartConfig.colorScaleRanges || []
                }
            }
        },
        legend: {
            ...DEFAULT_HEATMAP_CONFIG.legend,
            position: chartConfig.legendPosition as any,
            horizontalAlign: chartConfig.legendAlign as any,
            show: Array.isArray(chartConfig.colorScaleRanges) && 
                chartConfig.colorScaleRanges.length > 0 && 
                chartConfig.colorScaleRanges.some(r => r.name)
        }
    };

	// Create chart options with base transformer
	const options = BaseChartTransformer.createDefaultChartOptions(
		chartConfig,
		customOptions
	);

	return { options, series };
} 