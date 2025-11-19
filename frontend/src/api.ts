import { AUTH_API_URL, GENEALOGY_API_URL, getAuthHeaders } from './config';

export const api = {
  auth: {
    register: async (data: any) => {
      const response = await fetch(`${AUTH_API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Registration failed');
      return response.json();
    },
    login: async (data: any) => {
      const response = await fetch(`${AUTH_API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Login failed');
      return response.json();
    },
    verifyMfa: async (data: any) => {
      const response = await fetch(`${AUTH_API_URL}/verify-mfa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('MFA verification failed');
      return response.json();
    },
  },
  genealogy: {
    createTree: async (name: string, description: string) => {
      const response = await fetch(`${GENEALOGY_API_URL}/family-trees/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ name, description, is_public: false }),
      });
      if (!response.ok) throw new Error('Failed to create tree');
      return response.json();
    },
    exportGedcom: async (treeId: string) => {
      const response = await fetch(`${GENEALOGY_API_URL}/family-trees/${treeId}/export/gedcom`, {
        headers: { ...getAuthHeaders() },
      });
      if (!response.ok) throw new Error('Failed to export GEDCOM');
      return response.text();
    },
  },
};
