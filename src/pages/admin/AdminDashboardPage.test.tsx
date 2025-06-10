import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminDashboardPage from './AdminDashboardPage'; // Adjust path
import { SummaryAnalyticsData, TrendsDataResponse, TrendDataPoint } from '../../types/analytics'; // Adjust

// Mock react-chartjs-2 components
const mockBar = jest.fn();
jest.mock('react-chartjs-2', () => ({
  Bar: (props: any) => {
    mockBar(props.data, props.options); // Capture data and options passed to Bar
    return <div data-testid={`mock-bar-chart-${props.data.datasets[0].label?.replace(/\s+/g, '-') || 'default'}`}>Chart Content</div>;
  },
}));

// Mock Chart.js registration (actual registration is in component, this is to prevent errors in test if not fully mocked)
jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn(),
    // ... other Chart properties if needed by tests
  },
  CategoryScale: jest.fn(),
  LinearScale: jest.fn(),
  BarElement: jest.fn(),
  Title: jest.fn(),
  Tooltip: jest.fn(),
  Legend: jest.fn(),
}));


// Mock fetch
global.fetch = jest.fn();

const mockSummaryData: SummaryAnalyticsData = {
  totalUsers: 1500,
  newUsersLast7Days: 80,
  activeUsersLast24Hours: 400,
  totalFamilyTrees: 350,
  totalEvents: 5500,
  totalComments: 16000,
  totalMediaItems: 9000,
  lastUpdatedAt: new Date().toISOString(),
};

const mockUserTrends: TrendsDataResponse = {
  period: 'daily',
  startDate: '2023-10-01',
  endDate: '2023-10-03',
  dataPoints: [
    { date: '2023-10-01', count: 10 },
    { date: '2023-10-02', count: 15 },
    { date: '2023-10-03', count: 12 },
  ],
};

const mockEventTrends: TrendsDataResponse = {
  contentType: 'events',
  period: 'daily',
  startDate: '2023-10-01',
  endDate: '2023-10-03',
  dataPoints: [
    { date: '2023-10-01', count: 50 },
    { date: '2023-10-02', count: 70 },
    { date: '2023-10-03', count: 60 },
  ],
};


describe('AdminDashboardPage', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
    mockBar.mockClear();

    // Default mocks for initial fetches
    (fetch as jest.Mock)
      .mockResolvedValueOnce({ // For summary
        ok: true,
        json: async () => mockSummaryData,
      })
      .mockResolvedValueOnce({ // For user trends (initial: daily)
        ok: true,
        json: async () => mockUserTrends,
      })
      .mockResolvedValueOnce({ // For content trends (initial: events, daily)
        ok: true,
        json: async () => mockEventTrends,
      });
  });

  it('fetches and displays summary data', async () => {
    render(<AdminDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Total Users')).toBeInTheDocument();
      expect(screen.getByText('1500')).toBeInTheDocument();
      expect(screen.getByText('New Users (7 Days)')).toBeInTheDocument();
      expect(screen.getByText('80')).toBeInTheDocument();
      // Add checks for other stats if needed
    });
    expect(fetch).toHaveBeenCalledWith('/api/admin/analytics/summary');
  });

  it('fetches and displays user trends chart with initial data', async () => {
    render(<AdminDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('User Sign-up Trends')).toBeInTheDocument();
      expect(screen.getByTestId('mock-bar-chart-New-Users')).toBeInTheDocument(); // Chart is rendered
    });
    expect(fetch).toHaveBeenCalledWith('/api/admin/analytics/user-trends?period=daily');

    // Check data passed to Bar component
    const [userData, userOptions] = mockBar.mock.calls.find(call => call[0].datasets[0].label === 'New Users') || [null,null];
    expect(userData).toBeDefined();
    expect(userData.labels).toEqual(mockUserTrends.dataPoints.map(dp => new Date(dp.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })));
    expect(userData.datasets[0].data).toEqual(mockUserTrends.dataPoints.map(dp => dp.count));
  });

  it('fetches and displays content trends chart with initial data for events', async () => {
    render(<AdminDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Content Creation Trends')).toBeInTheDocument();
      expect(screen.getByTestId('mock-bar-chart-New-Events')).toBeInTheDocument(); // Chart is rendered
    });
    expect(fetch).toHaveBeenCalledWith('/api/admin/analytics/content-trends?contentType=events&period=daily');

    const [contentData, contentOptions] = mockBar.mock.calls.find(call => call[0].datasets[0].label === 'New Events') || [null,null];
    expect(contentData).toBeDefined();
    expect(contentData.labels).toEqual(mockEventTrends.dataPoints.map(dp => new Date(dp.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })));
    expect(contentData.datasets[0].data).toEqual(mockEventTrends.dataPoints.map(dp => dp.count));
  });


  it('refetches user trends when period is changed', async () => {
    render(<AdminDashboardPage />);
    await waitFor(() => expect(screen.getByTestId('mock-bar-chart-New-Users')).toBeInTheDocument());

    (fetch as jest.Mock).mockClear(); // Clear previous fetch calls for summary, initial user/content trends

    const newPeriod = 'weekly';
    const mockWeeklyUserTrends: TrendsDataResponse = { ...mockUserTrends, period: 'weekly', dataPoints: [{ date: '2023-W40', count: 50 }] };
    (fetch as jest.Mock).mockResolvedValueOnce({ // For user trends (weekly)
      ok: true,
      json: async () => mockWeeklyUserTrends,
    });

    const userPeriodSelect = screen.getByLabelText('Period:');
    await act(async () => {
      fireEvent.change(userPeriodSelect, { target: { value: newPeriod } });
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(`/api/admin/analytics/user-trends?period=${newPeriod}`);
    });
     // Check if chart data updated (mockBar would be called again)
    const [updatedUserData] = mockBar.mock.calls.find(call => call[0].datasets[0].label === 'New Users' && call[0].labels.includes(new Date('2023-W40').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))) || [null];
    expect(updatedUserData).toBeDefined();
    expect(updatedUserData.datasets[0].data).toEqual([50]);
  });

  it('refetches content trends when content type or period is changed', async () => {
    render(<AdminDashboardPage />);
    await waitFor(() => expect(screen.getByTestId('mock-bar-chart-New-Events')).toBeInTheDocument());
    (fetch as jest.Mock).mockClear();

    const newContentType = 'comments';
    const newContentPeriod = 'monthly';
    const mockMonthlyCommentTrends: TrendsDataResponse = {
        contentType: newContentType,
        period: newContentPeriod,
        startDate: '2023-09-01', endDate: '2023-09-30',
        dataPoints: [{ date: '2023-09-01', count: 200 }]
    };
    (fetch as jest.Mock).mockResolvedValueOnce({ // For content trends (comments, monthly)
      ok: true,
      json: async () => mockMonthlyCommentTrends,
    });

    const contentTypeSelect = screen.getByLabelText('Content Type:');
    const contentPeriodSelect = screen.getAllByLabelText('Period:')[1]; // Assuming second period select is for content

    await act(async () => {
      fireEvent.change(contentTypeSelect, { target: { value: newContentType } });
      // Changing type should trigger a fetch. Then change period.
    });
     await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(`/api/admin/analytics/content-trends?contentType=${newContentType}&period=daily`); // default period initially
    });

    // Now change period
    (fetch as jest.Mock).mockClear(); // Clear again
     (fetch as jest.Mock).mockResolvedValueOnce({ // For content trends (comments, monthly)
      ok: true,
      json: async () => mockMonthlyCommentTrends, // Return the monthly data now
    });

    await act(async () => {
      fireEvent.change(contentPeriodSelect, { target: { value: newContentPeriod } });
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(`/api/admin/analytics/content-trends?contentType=${newContentType}&period=${newContentPeriod}`);
    });
    const [updatedContentData] = mockBar.mock.calls.find(call => call[0].datasets[0].label === 'New Comments') || [null]; // Label changes
    expect(updatedContentData).toBeDefined();
    expect(updatedContentData.datasets[0].data).toEqual([200]);
  });

  // TODO: Test error states for each fetch (summary, user trends, content trends).
});
