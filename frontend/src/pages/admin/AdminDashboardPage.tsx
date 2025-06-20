import React, { useState, useEffect, useCallback } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
} from 'chart.js';
import { SummaryAnalyticsData, TrendsDataResponse, TrendPeriod, ContentTrendType, TrendDataPoint } from '../../types/analytics'; // Adjust path
import { logger } from '@shared/utils/logger';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Dummy UI Components (replace with actual from src/components/ui if available)
const Input = ({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) => (
  <div className="mb-2">
    {label && <label htmlFor={props.id || props.name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
    <input className="mt-1 block w-full px-3 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:text-white" {...props} />
  </div>
);
const Select = ({ label, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) => (
  <div className="mb-2">
    {label && <label htmlFor={props.id || props.name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
    <select className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:text-white" {...props}>{children}</select>
  </div>
);
const LoadingSpinner = ({text = "Loading data..."}) => <div className="text-center p-6"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div><p className="mt-2 text-sm text-gray-500 dark:text-gray-300">{text}</p></div>;
const StatCard: React.FC<{ title: string; value: string | number; isLoading?: boolean }> = ({ title, value, isLoading }) => (
  <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-5 text-center">
    <h3 className="text-md font-medium text-gray-500 dark:text-gray-400">{title}</h3>
    {isLoading ? <div className="h-8 mt-1 bg-gray-300 dark:bg-gray-700 rounded w-1/2 mx-auto animate-pulse"></div> : <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">{value}</p>}
  </div>
);
// End Dummy UI Components


const AdminDashboardPage: React.FC = () => {
  // Summary Stats
  const [summaryData, setSummaryData] = useState<SummaryAnalyticsData | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // User Trends
  const [userTrendsData, setUserTrendsData] = useState<TrendsDataResponse | null>(null);
  const [userTrendPeriod, setUserTrendPeriod] = useState<TrendPeriod>('daily');
  const [userTrendStartDate, setUserTrendStartDate] = useState<string>('');
  const [userTrendEndDate, setUserTrendEndDate] = useState<string>('');
  const [isLoadingUserTrends, setIsLoadingUserTrends] = useState(true);
  const [userTrendsError, setUserTrendsError] = useState<string | null>(null);

  // Content Trends
  const [contentTrendsData, setContentTrendsData] = useState<TrendsDataResponse | null>(null);
  const [contentTrendType, setContentTrendType] = useState<ContentTrendType>('events');
  const [contentTrendPeriod, setContentTrendPeriod] = useState<TrendPeriod>('daily');
  const [contentTrendStartDate, setContentTrendStartDate] = useState<string>('');
  const [contentTrendEndDate, setContentTrendEndDate] = useState<string>('');
  const [isLoadingContentTrends, setIsLoadingContentTrends] = useState(true);
  const [contentTrendsError, setContentTrendsError] = useState<string | null>(null);

  // Initialize default date range (e.g., last 30 days)
  useEffect(() => {
    const today = new Date();
    const pastDate = new Date();
    pastDate.setDate(today.getDate() - 30);
    const defaultEndDate = today.toISOString().split('T')[0];
    const defaultStartDate = pastDate.toISOString().split('T')[0];

    setUserTrendStartDate(defaultStartDate);
    setUserTrendEndDate(defaultEndDate);
    setContentTrendStartDate(defaultStartDate);
    setContentTrendEndDate(defaultEndDate);
  }, []);

  const fetchSummaryData = useCallback(async () => {
    setIsLoadingSummary(true);
    setSummaryError(null);
    try {
      const response = await fetch('/api/admin/analytics/summary');
      if (!response.ok) throw new Error('Failed to fetch summary data');
      const data: SummaryAnalyticsData = await response.json();
      setSummaryData(data);
    } catch (err) {
      logger.error("Error fetching summary data:", err);
      setSummaryError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoadingSummary(false);
    }
  }, []);

  const fetchUserTrends = useCallback(async (period: TrendPeriod, startDate?: string, endDate?: string) => {
    setIsLoadingUserTrends(true);
    setUserTrendsError(null);
    let query = `period=${period}`;
    if (startDate && endDate) {
      query = `startDate=${startDate}&endDate=${endDate}`; // Custom dates override period
    }
    try {
      const response = await fetch(`/api/admin/analytics/user-trends?${query}`);
      if (!response.ok) throw new Error('Failed to fetch user trends');
      const data: TrendsDataResponse = await response.json();
      setUserTrendsData(data);
    } catch (err) {
      logger.error(`Error fetching user trends for ${query}:`, err);
      setUserTrendsError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoadingUserTrends(false);
    }
  }, []);

  const fetchContentTrends = useCallback(async (type: ContentTrendType, period: TrendPeriod, startDate?: string, endDate?: string) => {
    setIsLoadingContentTrends(true);
    setContentTrendsError(null);
    let query = `contentType=${type}&period=${period}`;
    if (startDate && endDate) {
      query = `contentType=${type}&startDate=${startDate}&endDate=${endDate}`; // Custom dates override period
    }
    try {
      const response = await fetch(`/api/admin/analytics/content-trends?${query}`);
      if (!response.ok) throw new Error('Failed to fetch content trends');
      const data: TrendsDataResponse = await response.json();
      setContentTrendsData(data);
    } catch (err) {
      logger.error(`Error fetching content trends for ${query}:`, err);
      setContentTrendsError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoadingContentTrends(false);
    }
  }, []);

  useEffect(() => {
    fetchSummaryData();
  }, [fetchSummaryData]);

  useEffect(() => {
    if (userTrendStartDate && userTrendEndDate) {
        fetchUserTrends('custom', userTrendStartDate, userTrendEndDate); // Use 'custom' or let backend infer from dates
    } else {
        fetchUserTrends(userTrendPeriod);
    }
  }, [fetchUserTrends, userTrendPeriod, userTrendStartDate, userTrendEndDate]);

  useEffect(() => {
    if (contentTrendStartDate && contentTrendEndDate) {
        fetchContentTrends(contentTrendType, 'custom', contentTrendStartDate, contentTrendEndDate);
    } else {
        fetchContentTrends(contentTrendType, contentTrendPeriod);
    }
  }, [fetchContentTrends, contentTrendType, contentTrendPeriod, contentTrendStartDate, contentTrendEndDate]);


  const handleUserTrendPeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPeriod = e.target.value as TrendPeriod;
    setUserTrendPeriod(newPeriod);
    setUserTrendStartDate(''); // Clear custom dates when period changes
    setUserTrendEndDate('');
  };

  const handleUserTrendDateChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'start' | 'end') => {
    if (type === 'start') setUserTrendStartDate(e.target.value);
    if (type === 'end') setUserTrendEndDate(e.target.value);
    setUserTrendPeriod('custom'); // Indicate custom range is used
  };


  const handleContentTrendTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as ContentTrendType;
    setContentTrendType(newType);
  };

  const handleContentTrendPeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPeriod = e.target.value as TrendPeriod;
    setContentTrendPeriod(newPeriod);
    setContentTrendStartDate(''); // Clear custom dates
    setContentTrendEndDate('');
  };

  const handleContentTrendDateChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'start' | 'end') => {
    if (type === 'start') setContentTrendStartDate(e.target.value);
    if (type === 'end') setContentTrendEndDate(e.target.value);
    setContentTrendPeriod('custom'); // Indicate custom range is used
  };

  const generateChartData = (dataPoints?: TrendDataPoint[], label?: string): ChartData<'bar'> => ({
    labels: dataPoints?.map(dp => new Date(dp.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })) || [],
    datasets: [{
      label: label || 'Count',
      data: dataPoints?.map(dp => dp.count) || [],
      backgroundColor: 'rgba(59, 130, 246, 0.5)', // Tailwind blue-500 with opacity
      borderColor: 'rgba(59, 130, 246, 1)',
      borderWidth: 1,
    }],
  });

  const chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: false }, // Title set by section header
    },
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
  };

  return (
    <div className="p-4 md:p-6 space-y-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">Admin Dashboard</h1>

      {/* Summary Statistics */}
      <section>
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Summary Statistics</h2>
        {summaryError && <p className="text-red-500">Error loading summary: {summaryError}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <StatCard title="Total Users" value={summaryData?.totalUsers ?? '...'} isLoading={isLoadingSummary} />
          <StatCard title="New Users (7 Days)" value={summaryData?.newUsersLast7Days ?? '...'} isLoading={isLoadingSummary} />
          <StatCard title="Active Users (24h)" value={summaryData?.activeUsersLast24Hours ?? '...'} isLoading={isLoadingSummary} />
          <StatCard title="Total Family Trees" value={summaryData?.totalFamilyTrees ?? '...'} isLoading={isLoadingSummary} />
          <StatCard title="Total Events" value={summaryData?.totalEvents ?? '...'} isLoading={isLoadingSummary} />
          <StatCard title="Total Comments" value={summaryData?.totalComments ?? '...'} isLoading={isLoadingSummary} />
          <StatCard title="Total Media" value={summaryData?.totalMediaItems ?? '...'} isLoading={isLoadingSummary} />
        </div>
        {summaryData && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-right">Last updated: {new Date(summaryData.lastUpdatedAt).toLocaleString()}</p>}
      </section>

      {/* User Trends */}
      <section className="p-4 sm:p-6 bg-white dark:bg-gray-800 shadow-lg rounded-lg">
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">User Sign-up Trends</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4 items-end">
          <Select label="Period:" id="userTrendPeriod" value={userTrendPeriod} onChange={handleUserTrendPeriodChange}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="custom" disabled>Custom Range</option>
          </Select>
          <Input
            label="Start Date:"
            type="date"
            id="userTrendStartDate"
            value={userTrendStartDate}
            onChange={(e) => handleUserTrendDateChange(e, 'start')}
            max={userTrendEndDate || undefined}
          />
          <Input
            label="End Date:"
            type="date"
            id="userTrendEndDate"
            value={userTrendEndDate}
            onChange={(e) => handleUserTrendDateChange(e, 'end')}
            min={userTrendStartDate || undefined}
            max={new Date().toISOString().split('T')[0]} // Today max
          />
        </div>
        {isLoadingUserTrends && <LoadingSpinner text="Loading user trends..." />}
        {userTrendsError && <p className="text-red-500">Error: {userTrendsError}</p>}
        {userTrendsData && !isLoadingUserTrends && !userTrendsError && (
          <div className="h-72 md:h-96"> {/* Set explicit height for chart container */}
            <Bar options={chartOptions} data={generateChartData(userTrendsData.dataPoints, 'New Users')} />
          </div>
        )}
      </section>

      {/* Content Trends */}
      <section className="p-4 sm:p-6 bg-white dark:bg-gray-800 shadow-lg rounded-lg">
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Content Creation Trends</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4 items-end">
          <Select label="Content Type:" id="contentTrendType" value={contentTrendType} onChange={handleContentTrendTypeChange}>
            <option value="events">Events</option>
            <option value="comments">Comments</option>
            <option value="persons">Persons</option>
            <option value="trees">Family Trees</option>
            <option value="media">Media Items</option>
          </Select>
          <Select label="Period:" id="contentTrendPeriod" value={contentTrendPeriod} onChange={handleContentTrendPeriodChange}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="custom" disabled>Custom Range</option>
          </Select>
           <Input
            label="Start Date:"
            type="date"
            id="contentTrendStartDate"
            value={contentTrendStartDate}
            onChange={(e) => handleContentTrendDateChange(e, 'start')}
            max={contentTrendEndDate || undefined}
          />
          <Input
            label="End Date:"
            type="date"
            id="contentTrendEndDate"
            value={contentTrendEndDate}
            onChange={(e) => handleContentTrendDateChange(e, 'end')}
            min={contentTrendStartDate || undefined}
            max={new Date().toISOString().split('T')[0]} // Today max
          />
        </div>
        {isLoadingContentTrends && <LoadingSpinner text="Loading content trends..." />}
        {contentTrendsError && <p className="text-red-500">Error: {contentTrendsError}</p>}
        {contentTrendsData && !isLoadingContentTrends && !contentTrendsError && (
           <div className="h-72 md:h-96"> {/* Set explicit height for chart container */}
            <Bar options={chartOptions} data={generateChartData(contentTrendsData.dataPoints, `New ${contentTrendType.charAt(0).toUpperCase() + contentTrendType.slice(1)}`)} />
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminDashboardPage;
