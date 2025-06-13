import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom'; // For useNavigate used in the component
import AdminSiteSettingsPage from './AdminSiteSettingsPage'; // Adjust path
import { SiteSettingsData } from '../../types/settings'; // Adjust path

// Mock react-router-dom's useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate, // Used by "Cancel" button if implemented that way
}));

// Mock fetch
global.fetch = jest.fn();

const mockInitialSettings: SiteSettingsData = {
  _id: 'global_settings',
  siteName: 'Dzinza Platform Original',
  maintenanceMode: false,
  allowNewRegistrations: true,
  defaultLanguage: 'en',
  contactEmail: 'contact@example.com',
  featureFlags: {
    newOnboarding: true,
    betaFeatureX: false,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('AdminSiteSettingsPage', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
    mockNavigate.mockClear();

    // Default mock for GET settings
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockInitialSettings,
    });
  });

  const renderPage = () => {
    return render(
      <MemoryRouter> {/* Needed if any Link or navigate is used within */}
        <AdminSiteSettingsPage />
      </MemoryRouter>
    );
  };

  it('fetches and populates form fields with current settings', async () => {
    renderPage();
    expect(screen.getByText(/Loading settings.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByLabelText(/Site Name/i)).toHaveValue(mockInitialSettings.siteName);
      expect(screen.getByLabelText(/Contact Email/i)).toHaveValue(mockInitialSettings.contactEmail);
      expect(screen.getByLabelText(/Default Language/i)).toHaveValue(mockInitialSettings.defaultLanguage);
      expect(screen.getByLabelText(/Maintenance Mode/i)).not.toBeChecked();
      expect(screen.getByLabelText(/Allow New Registrations/i)).toBeChecked();

      // Check a feature flag
      const ffOnboarding = screen.getByLabelText(/Enable New Onboarding/i) as HTMLInputElement;
      expect(ffOnboarding.checked).toBe(mockInitialSettings.featureFlags.newOnboarding);
      const ffBetaX = screen.getByLabelText(/Enable Beta Feature X/i) as HTMLInputElement;
      expect(ffBetaX.checked).toBe(mockInitialSettings.featureFlags.betaFeatureX);
    });
    expect(fetch).toHaveBeenCalledWith('/api/admin/settings');
  });

  it('allows changing text input (siteName) and checkbox (maintenanceMode)', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByLabelText(/Site Name/i)).toBeInTheDocument());

    const siteNameInput = screen.getByLabelText(/Site Name/i);
    fireEvent.change(siteNameInput, { target: { value: 'New Site Name' } });
    expect(siteNameInput).toHaveValue('New Site Name');

    const maintenanceCheckbox = screen.getByLabelText(/Maintenance Mode/i);
    fireEvent.click(maintenanceCheckbox); // Toggle it
    expect(maintenanceCheckbox).toBeChecked();
  });

  it('submits updated settings and displays success message', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByLabelText(/Site Name/i)).toBeInTheDocument());

    // Change some settings
    fireEvent.change(screen.getByLabelText(/Site Name/i), { target: { value: 'Updated Platform' } });
    fireEvent.click(screen.getByLabelText(/Maintenance Mode/i)); // true
    const ffOnboardingCheckbox = screen.getByLabelText(/Enable New Onboarding/i);
    fireEvent.click(ffOnboardingCheckbox); // false (was true)


    // Mock the PUT request response
    const updatedSettingsResponse: SiteSettingsData = {
      ...mockInitialSettings,
      siteName: 'Updated Platform',
      maintenanceMode: true,
      featureFlags: {
        ...mockInitialSettings.featureFlags,
        newOnboarding: false,
      }
    };
    (fetch as jest.Mock).mockResolvedValueOnce({ // For the PUT request
      ok: true,
      json: async () => updatedSettingsResponse,
    });

    const saveButton = screen.getByRole('button', { name: /Save Settings/i });
    await act(async () => {
        fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/admin/settings', expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          siteName: 'Updated Platform',
          maintenanceMode: true, // Was false, clicked once
          allowNewRegistrations: mockInitialSettings.allowNewRegistrations, // Unchanged
          defaultLanguage: mockInitialSettings.defaultLanguage, // Unchanged
          contactEmail: mockInitialSettings.contactEmail, // Unchanged
          featureFlags: {
            newOnboarding: false, // Was true, clicked once
            betaFeatureX: mockInitialSettings.featureFlags.betaFeatureX, // Unchanged
          },
        }),
      }));
      expect(screen.getByText('Site settings updated successfully!')).toBeInTheDocument();
    });

    // Verify form fields are updated with response from API (if component does this)
    expect(screen.getByLabelText(/Site Name/i)).toHaveValue('Updated Platform');
    expect(screen.getByLabelText(/Maintenance Mode/i)).toBeChecked();
    expect(screen.getByLabelText(/Enable New Onboarding/i)).not.toBeChecked();
  });

  it('displays an error message if settings update fails', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByLabelText(/Site Name/i)).toBeInTheDocument());

    (fetch as jest.Mock).mockResolvedValueOnce({ // For the PUT request
      ok: false,
      json: async () => ({ message: 'Update failed due to server error' }),
    });

    const saveButton = screen.getByRole('button', { name: /Save Settings/i });
     await act(async () => {
        fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/Update failed due to server error/i)).toBeInTheDocument();
    });
  });

  // TODO:
  // - Test changing select dropdown (defaultLanguage).
  // - Test validation errors if backend were to return them for PUT (though current backend stub is simple).
  // - Test "Cancel" button navigation if it uses navigate().
});
