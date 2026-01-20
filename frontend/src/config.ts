export const AUTH_API_URL = 'http://localhost:8003';
export const GENEALOGY_API_URL = 'http://localhost:8006';

export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};
