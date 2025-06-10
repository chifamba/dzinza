import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route, Outlet, useLocation } from 'react-router-dom';
import AdminRouteGuard from './AdminRouteGuard'; // Adjust path as necessary

// Mock useAuth hook
const mockUseAuth = jest.fn();
jest.mock('../../hooks/useAuth', () => ({ // Adjust path to your useAuth hook
  useAuth: () => mockUseAuth(),
}));

// Mock child components for testing Outlet rendering
const MockAdminPage = () => <div data-testid="admin-page">Admin Page Content</div>;
const MockLoginPage = () => <div data-testid="login-page">Login Page</div>;
const MockDashboardPage = () => <div data-testid="dashboard-page">User Dashboard</div>;

// Helper to render AdminRouteGuard within a routing context
const renderWithRouter = (initialEntry = '/admin/protected') => {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/login" element={<MockLoginPage />} />
        <Route path="/dashboard" element={<MockDashboardPage />} />
        <Route element={<AdminRouteGuard />}>
          <Route path="/admin/protected" element={<MockAdminPage />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
};

describe('AdminRouteGuard', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockUseAuth.mockReset();
  });

  it('renders loading indicator when isLoadingAuth is true', () => {
    mockUseAuth.mockReturnValue({ currentUser: null, isLoadingAuth: true });
    renderWithRouter();
    expect(screen.getByText(/Checking authentication.../i)).toBeInTheDocument();
    expect(screen.queryByTestId('admin-page')).not.toBeInTheDocument();
  });

  it('redirects to /login if user is not authenticated', async () => {
    mockUseAuth.mockReturnValue({ currentUser: null, isLoadingAuth: false });
    renderWithRouter();
    // The Navigate component will cause a re-render. We wait for the login page content.
    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('admin-page')).not.toBeInTheDocument();
  });

  it('redirects to /dashboard if user is authenticated but not an admin', async () => {
    mockUseAuth.mockReturnValue({
      currentUser: { id: 'user123', roles: ['user'], name: 'Test User' },
      isLoadingAuth: false
    });
    // Mock alert as it's called in the component
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('admin-page')).not.toBeInTheDocument();
    expect(alertSpy).toHaveBeenCalledWith('Access Forbidden: You do not have administrator privileges.');
    alertSpy.mockRestore();
  });

  it('redirects to /dashboard if user is authenticated but roles array is empty or missing', async () => {
    mockUseAuth.mockReturnValue({
      currentUser: { id: 'user123', roles: [], name: 'Test User' }, // Empty roles
      isLoadingAuth: false
    });
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    renderWithRouter();
    await waitFor(() => expect(screen.getByTestId('dashboard-page')).toBeInTheDocument());
    alertSpy.mockRestore();

    mockUseAuth.mockReturnValue({
        currentUser: { id: 'user123', name: 'Test User' } as any, // roles missing
        isLoadingAuth: false
    });
    const alertSpy2 = jest.spyOn(window, 'alert').mockImplementation(() => {});
    renderWithRouter();
    await waitFor(() => expect(screen.getByTestId('dashboard-page')).toBeInTheDocument());
    alertSpy2.mockRestore();
  });


  it('renders the Outlet (admin page) if user is authenticated and is an admin', async () => {
    mockUseAuth.mockReturnValue({
      currentUser: { id: 'admin456', roles: ['user', 'admin'], name: 'Admin User' },
      isLoadingAuth: false
    });
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByTestId('admin-page')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dashboard-page')).not.toBeInTheDocument();
  });

  // Test that location state is passed on redirect to login
   it('passes location state when redirecting to /login', async () => {
    mockUseAuth.mockReturnValue({ currentUser: null, isLoadingAuth: false });

    // To check location.state, we need to access what navigate was called with.
    // The <Navigate> component uses useNavigate internally.
    // We can't directly check the state prop of <Navigate> easily with RTL alone after it has rendered.
    // However, if the login page were to display location.state.from.pathname, we could check that.
    // For now, this test confirms redirection happens. The actual state passing is a react-router feature.
    // A more involved test might involve a custom mock for Navigate or checking the actual history stack if possible.

    const initialEntry = '/admin/protected-path';
    render(
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/login" element={<MockLoginPageWithLocationState />} />
            <Route element={<AdminRouteGuard />}>
              <Route path="/admin/protected-path" element={<MockAdminPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

    await waitFor(() => {
        expect(screen.getByTestId('login-page')).toBeInTheDocument();
        // Check if the location state was passed (MockLoginPageWithLocationState would display it)
        expect(screen.getByTestId('login-page')).toHaveTextContent(`Redirected from: ${initialEntry}`);
    });
  });

  const MockLoginPageWithLocationState = () => {
      const location = useLocation();
      return <div data-testid="login-page">Login Page - Redirected from: {location.state?.from?.pathname}</div>;
  };

});
