// Enhanced FamilyMember interface
export interface FamilyMember {
  id: string;
  name: string; // Computed full name (first + middle + last)
  firstName?: string;
  middleName?: string;
  lastName?: string;
  birthDate?: string;
  deathDate?: string;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  profileImageUrl?: string;
  
  // Optional contact information (for enhanced forms)
  phoneNumbers?: PhoneNumber[];
  emailAddresses?: EmailAddress[];
  addresses?: Address[];
  
  // Optional extended information
  occupation?: string;
  placeOfBirth?: string;
  placeOfDeath?: string;
  biography?: string;
  notes?: string;
  
  // Relationships
  parentIds?: string[];
  spouseIds?: string[];
  childIds?: string[];
}

export interface Relationship {
  id: string;
  person1Id: string; // e.g., Parent or Spouse1
  person2Id: string; // e.g., Child or Spouse2
  type: 'PARENT_CHILD' | 'SPOUSE';
  // Optional: Add startDate, endDate for relationships like marriage
}

export interface FamilyTree {
  id: string;
  name: string;
  ownerId: string; // ID of the user who owns/manages this tree
  members: FamilyMember[];
  relationships: Relationship[];
}

// Contact Information Interfaces
export interface PhoneNumber {
  id?: string;
  phoneNumber: string;
  phoneType: 'mobile' | 'home' | 'work' | 'fax' | 'emergency' | 'other';
  countryCode?: string;
  extension?: string;
  isPrimary: boolean;
  isActive: boolean;
  notes?: string;
}

export interface EmailAddress {
  id?: string;
  emailAddress: string;
  emailType: 'personal' | 'work' | 'school' | 'business' | 'other';
  isPrimary: boolean;
  isActive: boolean;
  isVerified: boolean;
  notes?: string;
}

export interface Address {
  id?: string;
  streetAddress1?: string;
  streetAddress2?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  country: string;
  district?: string;
  ward?: string;
  region?: string;
  landmark?: string;
  traditionalAddress?: string;
  latitude?: number;
  longitude?: number;
  addressType: 'home' | 'work' | 'school' | 'historical' | 'birth' | 'other';
  isPrimary: boolean;
  isCurrent: boolean;
  livedFrom?: string;
  livedTo?: string;
  description?: string;
  notes?: string;
}

// Form interfaces for person creation with optional contact details
export interface CreatePersonFormData {
  // Required fields
  firstName: string;
  lastName: string;
  
  // Optional basic info
  middleName?: string;
  gender?: string;
  birthDate?: string;
  deathDate?: string;
  placeOfBirth?: string;
  placeOfDeath?: string;
  occupation?: string;
  biography?: string;
  notes?: string;
  
  // Optional contact information
  phoneNumbers?: Omit<PhoneNumber, 'id'>[];
  emailAddresses?: Omit<EmailAddress, 'id'>[];
  addresses?: Omit<Address, 'id'>[];
}

// Simple form for current UI (backward compatible)
export interface BasicPersonFormData {
  firstName: string;
  middleName?: string;
  lastName: string;
  gender?: string;
  birthDate?: string;
  deathDate?: string;
  profileImageUrl?: string;
}
