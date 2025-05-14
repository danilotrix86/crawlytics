import React, { useMemo } from 'react';
import { 
    useLogFileData, 
    DataComponentWrapper,
    createTitle
} from '../../shared/analytics-utils';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

// SQL Query for daily crawler activity with placeholder
const DAILY_CRAWLER_ACTIVITY_SQL = `
    SELECT 
        date(time) as date,
        crawler_name,
        COUNT(*) as count
    FROM 
        access_logs
    WHERE 
        crawler_name IS NOT NULL
        {LOG_FILE_CONDITION}
    GROUP BY 
        date(time),
        crawler_name
    ORDER BY 
        date(time) ASC
`;

// Type definitions
interface CrawlerDataPoint {
    date: string;
    crawler_name: string;
    count: number;
}

interface SeriesData {
    name: string;
    data: number[];
}

// Function to transform SQL data into chart format
const transformCrawlerData = (data: CrawlerDataPoint[]) => {
    if (!data.length) {
        return {
            series: [],
            categories: []
        };
    }
    
    // Group by crawler_name
    const crawlerMap = new Map<string, Map<string, number>>();
    const allDates = new Set<string>();
    const crawlerTotals = new Map<string, number>();
    
    // Initialize crawler map, collect all dates, and sum totals for each crawler
    data.forEach(item => {
        if (!crawlerMap.has(item.crawler_name)) {
            crawlerMap.set(item.crawler_name, new Map<string, number>());
            crawlerTotals.set(item.crawler_name, 0);
        }
        
        crawlerMap.get(item.crawler_name)!.set(item.date, item.count);
        allDates.add(item.date);
        
        // Update total count for this crawler
        const currentTotal = crawlerTotals.get(item.crawler_name) || 0;
        crawlerTotals.set(item.crawler_name, currentTotal + item.count);
    });
    
    // Sort dates
    const sortedDates = Array.from(allDates).sort();
    
    // Get top 7 crawlers by total request volume
    const topCrawlers = Array.from(crawlerTotals.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 7)
        .map(entry => entry[0]);
    
    // Create series data for top crawlers only
    const series: SeriesData[] = [];
    
    topCrawlers.forEach(crawlerName => {
        const dateMap = crawlerMap.get(crawlerName)!;
        const seriesData: number[] = [];
        
        sortedDates.forEach(date => {
            seriesData.push(dateMap.get(date) || 0);
        });
        
        series.push({
            name: crawlerName,
            data: seriesData
        });
    });
    
    return {
        series,
        categories: sortedDates
    };
};

// Content component
const DailyCrawlerActivityContent: React.FC = () => {
    // Use our custom hook for data fetching
    const { data, logFileId } = useLogFileData<CrawlerDataPoint[]>(
        DAILY_CRAWLER_ACTIVITY_SQL,
        []
    );
    
    // Safe data handling
    const safeData = Array.isArray(data) ? data : [];
    
    // Transform data for chart
    const chartData = useMemo(() => transformCrawlerData(safeData), [safeData]);
    
    // Chart options
    const chartOptions: ApexOptions = {
        chart: {
            type: 'area',
            height: 350,
            toolbar: {
                show: true
            },
            zoom: {
                enabled: true
            },
            stacked: false
        },
        title: {
            text: createTitle('🕸️ Top 7 Crawler Activity', logFileId),
            align: 'left'
        },
        xaxis: {
            categories: chartData.categories,
            title: {
                text: 'Date'
            }
        },
        yaxis: {
            title: {
                text: 'Number of Requests'
            }
        },
        tooltip: {
            y: {
                formatter: (value: number) => `${value} requests`
            }
        },
        legend: {
            position: 'top'
        },
        stroke: {
            width: 2,
            curve: 'smooth'
        },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.7,
                opacityTo: 0.2,
                stops: [0, 90, 100]
            }
        },
        colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'],
        dataLabels: {
            enabled: false,
        }
    };
    
    return (
        <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <ReactApexChart 
                options={chartOptions}
                series={chartData.series}
                type="area"
                height={350}
            />
        </div>
    );
};

// Main exported component
export const DailyCrawlerActivityChart: React.FC = () => (
    <DataComponentWrapper>
        <DailyCrawlerActivityContent />
    </DataComponentWrapper>
);

export default DailyCrawlerActivityChart; 