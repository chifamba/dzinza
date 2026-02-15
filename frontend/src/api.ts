import { AUTH_API_URL, GENEALOGY_API_URL, MODERATION_API_URL, getAuthHeaders } from './config';
import { AuthResponse, FamilyTree, User, Person, Relationship, FlaggedContent, UserBan } from './types';

interface RegisterData {
  email: string;
  password: string;
  name: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface CreateTreeData {
  name: string;
  description?: string;
  privacy_level: 'PUBLIC' | 'FAMILY_TREE_ONLY' | 'PRIVATE';
}

interface FlagContentData {
  content_type: 'PERSON' | 'MEDIA' | 'COMMENT';
  content_id: string;
  reason: string;
}

interface BanUserData {
  user_id: string;
  reason: string;
  expires_at?: string;
}

export const api = {
  auth: {
    register: async (data: RegisterData): Promise<AuthResponse> => {
      const response = await fetch(`${AUTH_API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }
      return response.json();
    },
    login: async (data: LoginData): Promise<AuthResponse> => {
      const response = await fetch(`${AUTH_API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }
      return response.json();
    },
    // Verify MFA placeholder - backend not ready yet
    // verifyMfa: async (...) => { ... }
  },
  genealogy: {
    getTrees: async (): Promise<FamilyTree[]> => {
      const headers = getAuthHeaders();
      if (!headers.Authorization) throw new Error('Not authenticated');

      const response = await fetch(`${GENEALOGY_API_URL}/familytrees`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch trees');
      }
      return response.json();
    },
    createTree: async (data: CreateTreeData): Promise<FamilyTree> => {
      const headers = getAuthHeaders();
      if (!headers.Authorization) throw new Error('Not authenticated');

      const response = await fetch(`${GENEALOGY_API_URL}/familytrees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create tree');
      }
      return response.json();
    },
    getTree: async (id: string): Promise<FamilyTree> => {
      const headers = getAuthHeaders();
      if (!headers.Authorization) throw new Error('Not authenticated');

      const response = await fetch(`${GENEALOGY_API_URL}/familytrees/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch tree');
      }
      return response.json();
    },
    exportGedcom: async (treeId: string): Promise<string> => {
      const headers = getAuthHeaders();
      if (!headers.Authorization) throw new Error('Not authenticated');

      const response = await fetch(`${GENEALOGY_API_URL}/familytrees/${treeId}/export`, {
        headers: { ...headers },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to export GEDCOM');
      }
      return response.text();
    },
    getTreePersons: async (treeId: string): Promise<Person[]> => {
      const headers = getAuthHeaders();
      if (!headers.Authorization) throw new Error('Not authenticated');

      const response = await fetch(`${GENEALOGY_API_URL}/familytrees/${treeId}/persons`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch tree persons');
      }
      return response.json();
    },
    getTreeRelationships: async (treeId: string): Promise<Relationship[]> => {
      const headers = getAuthHeaders();
      if (!headers.Authorization) throw new Error('Not authenticated');

      const response = await fetch(`${GENEALOGY_API_URL}/familytrees/${treeId}/relationships`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch tree relationships');
      }
      return response.json();
    },
  },
  moderation: {
    flagContent: async (data: FlagContentData): Promise<void> => {
      const headers = getAuthHeaders();
      if (!headers.Authorization) throw new Error('Not authenticated');

      const response = await fetch(`${MODERATION_API_URL}/flag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to flag content');
      }
    },
    banUser: async (data: BanUserData): Promise<void> => {
      const headers = getAuthHeaders();
      if (!headers.Authorization) throw new Error('Not authenticated');

      const response = await fetch(`${MODERATION_API_URL}/ban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to ban user');
      }
    },
    getFlaggedContent: async (): Promise<FlaggedContent[]> => {
      const headers = getAuthHeaders();
      if (!headers.Authorization) throw new Error('Not authenticated');

      const response = await fetch(`${MODERATION_API_URL}/flagged`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch flagged content');
      }
      return response.json();
    },
  },
};
