import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminRouteGuard from './AdminRouteGuard';

// Mock useAuth hook
const mockUseAuth = vi.fn();
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock useRouter
const mockRouter = {
  push: vi.fn(),
};
vi.mock('next/router', () => ({
  useRouter: () => mockRouter,
}));

describe('AdminRouteGuard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children when user is admin', () => {
    mockUseAuth.mockReturnValue({
      user: { isAdmin: true },
      loading: false,
    });

    render(
      <AdminRouteGuard>
        <div data-testid="protected-content">Admin Content</div>
      </AdminRouteGuard>
    );

    expect(screen.getByTestId('protected-content')).toBeTruthy();
    expect(screen.getByText('Admin Content')).toBeTruthy();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('redirects to home when user is not admin', () => {
    mockUseAuth.mockReturnValue({
      user: { isAdmin: false },
      loading: false,
    });

    render(
      <AdminRouteGuard>
        <div data-testid="protected-content">Admin Content</div>
      </AdminRouteGuard>
    );

    expect(mockRouter.push).toHaveBeenCalledWith('/');
    expect(screen.queryByTestId('protected-content')).toBeNull();
  });

  it('redirects to home when user is null', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
    });

    render(
      <AdminRouteGuard>
        <div data-testid="protected-content">Admin Content</div>
      </AdminRouteGuard>
    );

    expect(mockRouter.push).toHaveBeenCalledWith('/');
    expect(screen.queryByTestId('protected-content')).toBeNull();
  });

  it('shows loading indicator when auth is loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
    });

    render(
      <AdminRouteGuard>
        <div data-testid="protected-content">Admin Content</div>
      </AdminRouteGuard>
    );

    expect(screen.getByText(/loading/i)).toBeTruthy();
    expect(screen.queryByTestId('protected-content')).toBeNull();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('redirects to /dashboard if user is authenticated but not an admin', async () => {
    mockUseAuth.mockReturnValue({
      currentUser: { id: 'user123', roles: ['user'], name: 'Test User' },
      isLoadingAuth: false
    });
    // Mock alert as it's called in the component
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

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
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    renderWithRouter();
    await waitFor(() => expect(screen.getByTestId('dashboard-page')).toBeInTheDocument());
    alertSpy.mockRestore();

    mockUseAuth.mockReturnValue({
        currentUser: { id: 'user123', name: 'Test User' } as any, // roles missing
        isLoadingAuth: false
    });
    const alertSpy2 = vi.spyOn(window, 'alert').mockImplementation(() => {});
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
