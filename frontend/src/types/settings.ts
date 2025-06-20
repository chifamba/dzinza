// src/types/settings.ts

export interface SiteSettingsData {
  _id?: string; // Should be 'global_settings'
  siteName: string;
  maintenanceMode: boolean;
  allowNewRegistrations: boolean;
  defaultLanguage: 'en' | 'sn' | 'nd' | string; // Allow string for flexibility if more langs added
  contactEmail?: string;
  featureFlags: Record<string, boolean>; // e.g., { newOnboarding: true, betaFeatureX: false }
  updatedBy?: string; // User ID string
  createdAt?: string; // ISO date string
  updatedAt?: string; // ISO date string
}
