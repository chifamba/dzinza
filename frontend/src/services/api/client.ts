import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from "axios";

// Base configuration
// In development, use relative URLs to leverage Vite proxy
// In production, use the environment variable or default to relative path
const BASE_URL = import.meta.env.PROD
  ? import.meta.env.VITE_API_BASE_URL || ""
  : ""; // Use relative URLs to leverage proxy
const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 30000; // Increased timeout for docker environments

interface ApiError {
  error: string;
  message: string;
  statusCode?: number;
  details?: unknown;
}

class ApiClient {
  private instance: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: unknown) => void;
    reject: (error?: unknown) => void;
  }> = [];

  constructor() {
    this.instance = axios.create({
      baseURL: BASE_URL,
      timeout: API_TIMEOUT,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.instance.interceptors.request.use(
      (config) => {
        const tokenKey =
          import.meta.env.VITE_JWT_STORAGE_KEY || "dzinza_access_token";
        const token = localStorage.getItem(tokenKey);
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error: AxiosError) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle token refresh
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config as AxiosRequestConfig & {
          _retry?: boolean;
        };

        // If error is 401 and we haven't already tried to refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // If we're already refreshing, queue this request
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                return this.instance(originalRequest);
              })
              .catch((err) => {
                return Promise.reject(err);
              });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshTokenKey =
              import.meta.env.VITE_REFRESH_TOKEN_KEY || "dzinza_refresh_token";
            const accessTokenKey =
              import.meta.env.VITE_JWT_STORAGE_KEY || "dzinza_access_token";
            const refreshToken = localStorage.getItem(refreshTokenKey);
            if (!refreshToken) {
              throw new Error("No refresh token available");
            }

            const response = await axios.post(`${BASE_URL}/auth/refresh`, {
              refreshToken,
            });

            const { accessToken, refreshToken: newRefreshToken } =
              response.data;

            localStorage.setItem(accessTokenKey, accessToken);
            localStorage.setItem(refreshTokenKey, newRefreshToken);

            // Process queued requests
            this.processQueue(null, accessToken);

            // Retry original request
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            }
            return this.instance(originalRequest);
          } catch (refreshError) {
            // Refresh failed, clear tokens and redirect to login
            this.processQueue(refreshError, null);
            const accessTokenKey =
              import.meta.env.VITE_JWT_STORAGE_KEY || "dzinza_access_token";
            const refreshTokenKey =
              import.meta.env.VITE_REFRESH_TOKEN_KEY || "dzinza_refresh_token";
            localStorage.removeItem(accessTokenKey);
            localStorage.removeItem(refreshTokenKey);

            // Dispatch custom event to trigger logout
            // Recommendation: Add a global event listener for 'auth:logout' in your main App component
            // or a top-level layout component. This listener should dispatch the Redux logout action
            // to ensure application-wide state cleanup and UI redirect to login.
            // Example:
            // useEffect(() => {
            //   const handleLogout = () => dispatch(logoutAction());
            //   window.addEventListener('auth:logout', handleLogout);
            //   return () => window.removeEventListener('auth:logout', handleLogout);
            // }, [dispatch]);
            window.dispatchEvent(new CustomEvent("auth:logout"));

            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private processQueue(error: unknown, token: string | null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });

    this.failedQueue = [];
  }

  // HTTP Methods
  async get<T = unknown>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.instance.get(url, config);
  }

  async post<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.instance.post(url, data, config);
  }

  async put<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.instance.put(url, data, config);
  }

  async patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.instance.patch(url, data, config);
  }

  async delete<T = unknown>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.instance.delete(url, config);
  }

  // Upload file with progress tracking
  async uploadFile<T = unknown>(
    url: string,
    file: File,
    onUploadProgress?: (progressEvent: any) => void,
    additionalData?: Record<string, any>
  ): Promise<AxiosResponse<T>> {
    const formData = new FormData();
    formData.append("file", file);

    if (additionalData) {
      Object.keys(additionalData).forEach((key) => {
        formData.append(key, additionalData[key]);
      });
    }

    return this.instance.post(url, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress,
    });
  }

  // Download file
  async downloadFile(url: string, filename?: string): Promise<void> {
    const response = await this.instance.get(url, {
      responseType: "blob",
    });

    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename || "download";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  }

  // Set auth token manually
  setAuthToken(token: string | null) {
    if (token) {
      this.instance.defaults.headers.common.Authorization = `Bearer ${token}`;
      localStorage.setItem("accessToken", token);
    } else {
      delete this.instance.defaults.headers.common.Authorization;
      localStorage.removeItem("accessToken");
    }
  }

  // Get current auth token
  getAuthToken(): string | null {
    return localStorage.getItem("accessToken");
  }

  // Clear auth token
  clearAuthToken() {
    delete this.instance.defaults.headers.common.Authorization;
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  }
}

export const apiClient = new ApiClient();

// Export axios instance for direct use if needed
export { axios };
