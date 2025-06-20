// src/types/genealogy.ts
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
  // Relationships are often derived or stored separately,
  // but direct links can be useful for simpler models.
  // For a more robust model, relationships would be their own entities.
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
