import React, { useState, useEffect, FormEvent, useCallback } from 'react';
import { SiteSettingsData } from '../../types/settings'; // Adjust path as necessary
import { logger } from '@shared/utils/logger';
// Assuming dummy UI components are available or import from src/components/ui
// For brevity, using inline dummy components here.

// Dummy UI Components
const Input = ({ label, type = "text", ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => (
  <div className="mb-4">
    <label htmlFor={props.id || props.name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
    <input type={type} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white" {...props} />
  </div>
);
const Checkbox = ({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => (
  <label className="flex items-center space-x-2 py-2">
    <input type="checkbox" className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:bg-gray-700 dark:focus:ring-offset-gray-800" {...props} />
    <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
  </label>
);
const Select = ({ label, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) => (
  <div className="mb-4">
    <label htmlFor={props.id || props.name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
    <select className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:text-white" {...props}>{children}</select>
  </div>
);
const Button = ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & {variant?: string}) => (
  <button
    className={`px-6 py-2.5 font-semibold rounded-md text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2
                ${props.disabled ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed' :
                  (props.variant === 'secondary' ? 'bg-gray-200 dark:bg-gray-500 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 focus:ring-gray-400' :
                   'text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500')}
                ${props.className || ''}`}
    {...props}
  >
    {children}
  </button>
);
const LoadingSpinner = ({text = "Loading settings..."}) => <div className="text-center p-10"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div><p className="mt-3 text-gray-600 dark:text-gray-300">{text}</p></div>;
// End Dummy UI Components

const availableLanguages = [
    { value: 'en', label: 'English' },
    { value: 'sn', label: 'Shona' },
    { value: 'nd', label: 'Ndebele' },
];

const AdminSiteSettingsPage: React.FC = () => {
  const [currentSettings, setCurrentSettings] = useState<SiteSettingsData | null>(null);
  const [formState, setFormState] = useState<Partial<SiteSettingsData>>({});
  const [featureFlagsState, setFeatureFlagsState] = useState<Record<string, boolean>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/settings'); // Auth handled by global fetch/AdminRouteGuard
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Failed to fetch site settings. Status: ${response.status}`);
      }
      const data: SiteSettingsData = await response.json();
      setCurrentSettings(data);
      // Initialize form state from fetched settings
      setFormState({
        siteName: data.siteName,
        maintenanceMode: data.maintenanceMode,
        allowNewRegistrations: data.allowNewRegistrations,
        defaultLanguage: data.defaultLanguage,
        contactEmail: data.contactEmail || '',
      });
      setFeatureFlagsState(data.featureFlags || {});
    } catch (err) {
      logger.error('Error fetching site settings:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    const val = isCheckbox ? (e.target as HTMLInputElement).checked : value;
    setFormState(prev => ({ ...prev, [name]: val }));
  };

  const handleFeatureFlagChange = (flagKey: string, value: boolean) => {
    setFeatureFlagsState(prev => ({ ...prev, [flagKey]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    const payload: Partial<SiteSettingsData> = {
      ...formState,
      featureFlags: featureFlagsState,
    };
    // Remove undefined or empty string contactEmail if it's optional and meant to be unset
    if (payload.contactEmail === '') {
        delete payload.contactEmail;
    }


    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' /* Auth handled globally */ },
        body: JSON.stringify(payload),
      });
      const responseData: SiteSettingsData = await response.json();
      if (!response.ok) {
        throw new Error((responseData as any).message || (responseData as any).errors?.[0]?.msg || 'Failed to update settings.');
      }
      setSuccessMessage('Site settings updated successfully!');
      setCurrentSettings(responseData); // Update current settings with response
      setFormState({ // Re-initialize form with saved data to reflect backend state
        siteName: responseData.siteName,
        maintenanceMode: responseData.maintenanceMode,
        allowNewRegistrations: responseData.allowNewRegistrations,
        defaultLanguage: responseData.defaultLanguage,
        contactEmail: responseData.contactEmail || '',
      });
      setFeatureFlagsState(responseData.featureFlags || {});
    } catch (err) {
      logger.error('Error updating site settings:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred during update.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingSpinner />;
  // Show error prominently if initial fetch fails and no data is available
  if (error && !currentSettings) return <div className="p-6 bg-red-100 text-red-700 rounded-md shadow">{error}</div>;
  if (!currentSettings) return <div className="p-6 text-center text-gray-500 dark:text-gray-400">Site settings could not be loaded.</div>;


  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mb-8 pb-4 border-b dark:border-gray-700">
        Site-Wide Settings
      </h1>

      {/* Display submission error/success messages */}
      {error && !isLoading && <div className="mb-6 p-4 bg-red-100 text-red-700 border border-red-300 rounded-md shadow">{error}</div>}
      {successMessage && <div className="mb-6 p-4 bg-green-100 text-green-700 border border-green-300 rounded-md shadow">{successMessage}</div>}

      <form onSubmit={handleSubmit} className="space-y-8 bg-white dark:bg-gray-800 p-6 sm:p-8 shadow-xl rounded-lg">
        <Input label="Site Name" id="siteName" name="siteName" type="text" value={formState.siteName || ''} onChange={handleInputChange} disabled={isSubmitting} />
        <Input label="Contact Email" id="contactEmail" name="contactEmail" type="email" value={formState.contactEmail || ''} onChange={handleInputChange} disabled={isSubmitting} placeholder="admin@example.com" />

        <Select label="Default Language" id="defaultLanguage" name="defaultLanguage" value={formState.defaultLanguage || 'en'} onChange={handleInputChange} disabled={isSubmitting}>
          {availableLanguages.map(lang => (
            <option key={lang.value} value={lang.value}>{lang.label}</option>
          ))}
        </Select>

        <Checkbox label="Maintenance Mode" id="maintenanceMode" name="maintenanceMode" checked={formState.maintenanceMode || false} onChange={handleInputChange} disabled={isSubmitting} />
        <Checkbox label="Allow New Registrations" id="allowNewRegistrations" name="allowNewRegistrations" checked={formState.allowNewRegistrations !== false} onChange={handleInputChange} disabled={isSubmitting} />

        <div>
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2 pt-4 border-t dark:border-gray-700">Feature Flags</h3>
          {Object.keys(featureFlagsState).length > 0 ? (
            <div className="space-y-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              {Object.entries(featureFlagsState).map(([flagKey, flagValue]) => (
                <Checkbox
                  key={flagKey}
                  id={`feature-${flagKey}`}
                  label={`Enable ${flagKey.replace(/([A-Z])/g, ' $1').trim()}`} // Add space before caps for display
                  checked={flagValue}
                  onChange={(e) => handleFeatureFlagChange(flagKey, e.target.checked)}
                  disabled={isSubmitting}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No feature flags currently defined by the backend.</p>
          )}
        </div>

        <div className="pt-6 border-t dark:border-gray-700">
          <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AdminSiteSettingsPage;
