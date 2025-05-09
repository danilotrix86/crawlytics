/**
 * Chart Theme Constants
 * 
 * This file contains centralized theme constants for all chart components,
 * leveraging Tailwind CSS color palette for consistency.
 */

// Primary chart color palette - all charts will use these colors in order
export const CHART_COLOR_PALETTE = [
	'#2E93fA',  // Blue
	'#66DA26',  // Green
	'#FF9800',  // Orange
	'#E91E63',  // Red
	'#33b2df',  // Light blue
	'#546E7A',  // Gray
	'#d4526e',  // Purple
	'#13d8aa',  // Teal
	'#A5978B',  // Brown
	'#FFA600',  // Amber
];

// Semantic color mapping (now referencing the main palette)
export const CHART_COLORS = {
	primary: CHART_COLOR_PALETTE[0],   // Blue
	success: CHART_COLOR_PALETTE[1],   // Green
	warning: CHART_COLOR_PALETTE[2],   // Orange
	danger: CHART_COLOR_PALETTE[3],    // Red
	info: CHART_COLOR_PALETTE[4],      // Light blue
	neutral: CHART_COLOR_PALETTE[5],   // Gray
	purple: CHART_COLOR_PALETTE[6],    // Purple
	teal: CHART_COLOR_PALETTE[7],      // Teal
	brown: CHART_COLOR_PALETTE[8],     // Brown
	amber: CHART_COLOR_PALETTE[9],     // Amber
	dark: '#304758',                   // Dark blue (for text)
	gray: '#A5A5A5',                   // Light gray
};

// We'll use the primary palette for all charts instead of extended colors
export const EXTENDED_COLORS = CHART_COLOR_PALETTE;

// Color maps for specific datasets
export const COLOR_MAPS = {
	// Status code colors
	statusCodes: {
		'2xx Success': CHART_COLORS.success,    
		'3xx Redirection': CHART_COLORS.info,   
		'4xx Client Error': CHART_COLORS.warning,
		'5xx Server Error': CHART_COLORS.danger, 
		'Other': CHART_COLORS.gray              
	},

	// Traffic source colors
	trafficSources: {
		'Human': CHART_COLORS.primary,
		'Bot': CHART_COLORS.warning,
		'LLM': CHART_COLORS.success
	},

	// LLM crawler colors - using the main palette in order
	llmCrawlers: {
		'GPTBot': CHART_COLOR_PALETTE[0],
		'Claude': CHART_COLOR_PALETTE[1],
		'Bard': CHART_COLOR_PALETTE[2],
		'Anthropic': CHART_COLOR_PALETTE[3],
		'Cohere': CHART_COLOR_PALETTE[4],
		'Other LLM': CHART_COLOR_PALETTE[5]
	}
};

// Chart typography settings
export const CHART_TYPOGRAPHY = {
	title: {
		fontSize: '16px',
		fontWeight: 'bold',
		fontFamily: 'inherit'
	},
	label: {
		fontSize: '12px',
		fontWeight: 500
	},
	dataLabel: {
		fontSize: '12px',
		colors: [CHART_COLORS.dark]
	}
};

// Common chart configs
export const CHART_DEFAULTS = {
	height: {
		small: 300,
		medium: 400,
		large: 500
	},
	borderRadius: 4,
	opacity: 1,
	transition: {
		speed: 350,
		easing: 'linear'
	},
	// Default colors array for all charts
	colors: CHART_COLOR_PALETTE
};

// Chart grid defaults
export const CHART_GRID = {
	borderColor: '#e7e7e7',
	xaxis: { lines: { show: false } },
	yaxis: { lines: { show: true } }
};

// Export default theme object
export default {
	colors: CHART_COLORS,
	palette: CHART_COLOR_PALETTE,
	colorMaps: COLOR_MAPS,
	typography: CHART_TYPOGRAPHY,
	defaults: CHART_DEFAULTS,
	grid: CHART_GRID
}; 