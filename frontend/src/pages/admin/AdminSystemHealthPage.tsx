import React, { useState, useEffect, useCallback } from 'react';
import { SystemHealthData, ServiceHealth } from '../../types/admin'; // Adjust path as necessary
import { logger } from '@shared/utils/logger';
import { RefreshCw } from 'lucide-react'; // Icon for refresh button

// Dummy UI Components (replace with actual from src/components/ui if available)
const Button = ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & {variant?: string, size?: string}) => (
  <button
    className={`px-3 py-1.5 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1
                ${props.disabled ? 'text-gray-400 bg-gray-200 dark:bg-gray-600 dark:text-gray-500 cursor-not-allowed' :
                  (props.variant === 'secondary' ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 focus:ring-gray-400' :
                   'text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500')}
                ${props.size === 'small' ? 'text-xs px-2 py-1' : 'text-sm'}
                ${props.className || ''}`}
    {...props}
  >
    {children}
  </button>
);
const LoadingSpinner = ({text = "Loading system health..."}) => <div className="text-center p-8"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div><p className="mt-2 text-gray-600 dark:text-gray-300">{text}</p></div>;
// End Dummy UI Components

const getStatusColorClasses = (status: string): string => {
    status = status.toUpperCase();
    switch (status) {
      case 'UP':
        return 'bg-green-100 dark:bg-green-700 text-green-800 dark:text-green-100';
      case 'DOWN':
        return 'bg-red-100 dark:bg-red-700 text-red-800 dark:text-red-100';
      case 'DEGRADED':
        return 'bg-yellow-100 dark:bg-yellow-700 text-yellow-800 dark:text-yellow-100';
      case 'UNKNOWN':
        return 'bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200';
      default:
        return 'bg-gray-200 dark:bg-gray-500 text-gray-700 dark:text-gray-100';
    }
};

const AdminSystemHealthPage: React.FC = () => {
  const [healthData, setHealthData] = useState<SystemHealthData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealthData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/system-health'); // Auth token handled by global fetch wrapper
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Failed to fetch system health. Status: ${response.status}`);
      }
      const data: SystemHealthData = await response.json();
      setHealthData(data);
    } catch (err) {
      logger.error('Error fetching system health:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setHealthData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealthData();
  }, [fetchHealthData]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">System Health Status</h1>
        <Button onClick={fetchHealthData} disabled={isLoading} variant="secondary" size="small">
          <RefreshCw size={14} className={`inline mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {isLoading && <LoadingSpinner />}
      {error && (
        <div className="p-4 bg-red-100 text-red-700 border border-red-300 rounded-md shadow-md" role="alert">
          <strong className="font-bold">Error:</strong> {error}
        </div>
      )}

      {healthData && !isLoading && !error && (
        <div className="space-y-6">
          {/* Overall Status Section */}
          <section className="p-6 bg-white dark:bg-gray-800 shadow-xl rounded-lg">
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-3">Overall System Status</h2>
            <div className="flex items-center space-x-3">
              <span className={`px-4 py-1.5 text-lg font-bold rounded-full ${getStatusColorClasses(healthData.overallStatus)}`}>
                {healthData.overallStatus.toUpperCase()}
              </span>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Last checked: {new Date(healthData.timestamp).toLocaleString()}
              </p>
            </div>
          </section>

          {/* Individual Services Section */}
          <section>
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Service Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {healthData.services.map((service) => (
                <div key={service.name} className={`p-4 shadow-lg rounded-lg border-l-4 ${
                    service.status.toUpperCase() === 'UP' ? 'border-green-500 dark:border-green-400' :
                    service.status.toUpperCase() === 'DOWN' ? 'border-red-500 dark:border-red-400' :
                    service.status.toUpperCase() === 'DEGRADED' ? 'border-yellow-500 dark:border-yellow-400' :
                    'border-gray-400 dark:border-gray-500'
                } bg-white dark:bg-gray-800`}>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">{service.name}</h3>
                    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${getStatusColorClasses(service.status)}`}>
                      {service.status.toUpperCase()}
                    </span>
                  </div>
                  {service.details && (
                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      {service.details.timestamp && (
                        <p>Service Timestamp: {new Date(service.details.timestamp).toLocaleTimeString()}</p>
                      )}
                      {service.details.dependencies && Object.entries(service.details.dependencies).map(([depName, depValue]) => (
                        <p key={depName} className="capitalize">
                          {depName}: {}
                          {typeof depValue === 'string' ?
                            <span className={`ml-1 font-medium ${depValue.toUpperCase() === 'UP' ? 'text-green-600 dark:text-green-300' : 'text-red-600 dark:text-red-300'}`}>{depValue.toUpperCase()}</span> :
                            <span className={`ml-1 font-medium ${ (depValue as any)?.status?.toUpperCase() === 'UP' ? 'text-green-600 dark:text-green-300' : 'text-red-600 dark:text-red-300'}`}>
                                {(depValue as any)?.status?.toUpperCase()}
                                {(depValue as any)?.reason && <span className="text-gray-500 dark:text-gray-400 text-xs italic"> ({ (depValue as any)?.reason })</span>}
                            </span>
                          }
                        </p>
                      ))}
                      {service.details.reason && !service.details.dependencies && ( // For UNKNOWN status with a reason
                         <p className="italic">Reason: {service.details.reason}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default AdminSystemHealthPage;
