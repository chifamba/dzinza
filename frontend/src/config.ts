export const AUTH_API_URL = '/api/auth';
export const GENEALOGY_API_URL = '/api/genealogy';
export const MEDIA_API_URL = '/api/media';
export const NOTIFICATION_API_URL = '/api/notifications';
export const MODERATION_API_URL = '/api/moderation';

export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};
