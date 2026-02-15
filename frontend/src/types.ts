export interface User {
  id: string;
  email: string;
  name: string;
  roles?: string[];
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
}

export interface FamilyTree {
  id: string;
  owner_id: string;
  name: string;
  description?: string;
  root_person_id?: string;
  privacy_level: 'PUBLIC' | 'FAMILY_TREE_ONLY' | 'PRIVATE';
  created_at: string;
  updated_at: string;
}

export interface Name {
  given_name: string;
  surname: string;
  prefix?: string;
  suffix?: string;
  nickname?: string;
  type?: string;
}

export interface Fact {
  type: string;
  date?: string;
  place?: string;
  description?: string;
  sources?: string[];
  privacy_level?: string;
  metadata?: Record<string, any>;
}

export interface Person {
  id: string;
  primary_name: Name;
  alternate_names?: Name[];
  gender: 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN';
  birth_date_string?: string;
  birth_date_exact?: string;
  birth_place?: string;
  death_date_string?: string;
  death_date_exact?: string;
  is_living: boolean;
  biography?: string;
  clan?: string;
  tribe?: string;
  traditional_titles?: string[];
  privacy_settings?: Record<string, any>;
  facts?: Fact[];
  tree_id: string;
  created_at: string;
  updated_at: string;
}

export interface Relationship {
  id: string;
  person1_id: string;
  person2_id: string;
  type: 'PARENT_OF' | 'SPOUSE_OF' | 'SIBLING_OF' | 'MEMBER_OF';
  metadata?: Record<string, any>;
}

export interface Media {
  id: string;
  user_id: string;
  person_id?: string;
  filename: string;
  content_type: string;
  size: number;
  s3_key: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface FlaggedContent {
  id: string;
  content_type: 'PERSON' | 'MEDIA' | 'COMMENT';
  content_id: string;
  reason: string;
  reporter_id: string;
  status: 'PENDING' | 'REVIEWED' | 'REMOVED';
  created_at: string;
}

export interface UserBan {
  user_id: string;
  banned_by: string;
  reason: string;
  banned_at: string;
  expires_at?: string;
}
