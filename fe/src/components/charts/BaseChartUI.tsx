import React from 'react';
import ReactApexChart from 'react-apexcharts';
import { Card } from 'flowbite-react';
import { ApexOptions } from 'apexcharts';

// Chart type allowed by ApexCharts
type ApexChartType = 'line' | 'area' | 'bar' | 'pie' | 'donut' | 'radialBar' |
    'scatter' | 'bubble' | 'heatmap' | 'candlestick' | 'boxPlot' |
    'radar' | 'polarArea' | 'rangeBar' | 'rangeArea' | 'treemap';

// Define generic props for all chart UI components
export interface BaseChartUIProps {
    options: ApexOptions;
    series: any; // Generic series type (will be typed by the specific chart components)
    className?: string;
    cardClassName?: string;
    chartClassName?: string;
    showCard?: boolean;
    cardProps?: Record<string, any>;
    testId?: string;
    loading?: boolean;
    loadingComponent?: React.ReactNode;
    noDataComponent?: React.ReactNode;
    // Function to determine if chart has data (varies by chart type)
    hasDataFn?: (series: any) => boolean;
    chartType?: ApexChartType;
    height?: number | string;
}

const DEFAULT_HEIGHT = 350;

// Generic chart UI component
export const BaseChartUI = React.memo(function BaseChartUI({
    options,
    series,
    className = '',
    cardClassName = '',
    chartClassName = '',
    showCard = true,
    cardProps = {},
    testId = 'base-chart',
    loading = false,
    loadingComponent,
    noDataComponent,
    hasDataFn,
    chartType: propChartType,
    height: propHeight
}: BaseChartUIProps): React.ReactElement {
    // Extract chart configuration with defaults
    const chartType = propChartType || options?.chart?.type || 'line';
    const chartHeight = propHeight || options?.chart?.height || DEFAULT_HEIGHT;

    // Get numeric height for container sizing
    const numericHeight = typeof chartHeight === 'string' ?
        parseInt(chartHeight, 10) : chartHeight;
    const validHeight = isNaN(numericHeight) || numericHeight <= 0 ?
        DEFAULT_HEIGHT : numericHeight;

    // Determine if there's data to show
    // If a custom hasDataFn is provided, use it, otherwise check if series is non-empty
    const hasData = !loading && (hasDataFn ?
        hasDataFn(series) :
        (Array.isArray(series) && series.length > 0)
    );

    // Message to display when no data is available
    const noDataMessage = options?.noData?.text || "Chart data is unavailable.";

    // Content rendering based on state
    const renderContent = () => {
        if (loading) {
            return (
                <div
                    className="flex items-center justify-center"
                    style={{ minHeight: `${validHeight}px` }}
                    data-testid={`${testId}-loading`}
                >
                    {loadingComponent || (
                        <div className="animate-pulse text-gray-500 dark:text-gray-400">
                            Loading chart data...
                        </div>
                    )}
                </div>
            );
        }

        if (hasData) {
            return (
                <div className={`w-full ${chartClassName}`} data-testid={`${testId}-content`}>
                    <ReactApexChart
                        options={options}
                        series={series}
                        type={chartType}
                        height={chartHeight}
                        width="100%"
                    />
                </div>
            );
        }

        return (
            <div
                className="flex items-center justify-center text-center p-4"
                style={{ minHeight: `${validHeight}px` }}
                data-testid={`${testId}-no-data`}
            >
                {noDataComponent || (
                    <p className="text-gray-500 dark:text-gray-400">{noDataMessage}</p>
                )}
            </div>
        );
    };

    // Common classes for the container
    const containerClasses = `transition-standard dark:bg-gray-800 w-full ${className}`;

    if (showCard) {
        return (
            <Card
                className={`${containerClasses} hover:shadow-lg ${cardClassName}`}
                data-testid={testId}
                {...cardProps}
            >
                {renderContent()}
            </Card>
        );
    }

    return (
        <div className={containerClasses} data-testid={testId}>
            {renderContent()}
        </div>
    );
});

// Set display name for debugging
BaseChartUI.displayName = 'BaseChartUI';

export default BaseChartUI; 