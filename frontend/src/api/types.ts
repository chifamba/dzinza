// Types mirroring api/models.py. Keep in sync when the backend changes.

export type PrivacySetting = "PUBLIC" | "FAMILY_TREE_ONLY" | "PRIVATE";
export type Gender = "MALE" | "FEMALE" | "OTHER" | "UNKNOWN";
export type RelationshipType =
  | "SPOUSE"
  | "PARENT_CHILD"
  | "SIBLING"
  | "ADOPTIVE"
  | "STEP_PARENT_CHILD"
  | "OTHER";
export type SpousalStatus = "MARRIED" | "DIVORCED" | "WIDOWED" | "UNKNOWN";
export type Confidence = "attested" | "single_source" | "inferred";
export type SourceType =
  | "oral_testimony"
  | "document"
  | "book"
  | "archive"
  | "website"
  | "other";

export interface PersonName {
  given_name: string;
  surname: string;
  prefix?: string;
  suffix?: string;
  nickname?: string;
}

export interface Fact {
  id: string;
  type: string;
  value: string;
  date_string?: string;
  place?: string;
  description?: string;
  confidence?: Confidence | null;
  source_ids: string[];
  citations: string[];
}

export interface Source {
  id: string;
  tree_id: string;
  title: string;
  type: SourceType;
  teller?: string;
  date_recorded?: string;
  reference?: string;
  file_id?: string;
  notes?: string;
}

export interface RelationshipEvent {
  event_type: string;
  date_string?: string;
  date_exact?: string;
  place?: string;
  description?: string;
  source_ids: string[];
  citations: string[];
}

export interface Relationship {
  id: string;
  tree_id: string;
  person1_id: string;
  person2_id: string;
  relationship_type: RelationshipType;
  spousal_status?: SpousalStatus | null;
  start_date_string?: string;
  place?: string;
  notes?: string;
}

export interface RelationshipDetail extends Relationship {
  person1_name?: string;
  person2_name?: string;
}

export interface RelationshipSummary {
  id?: string;
  type: string;
  other_person_id: string;
  other_person_name: string;
}

export interface LifeEvent {
  id: string;
  person_id: string;
  event_type: string;
  date_string?: string;
  date_exact?: string;
  place?: string;
  description?: string;
  confidence?: Confidence | null;
  source_ids: string[];
}

export interface Person {
  id: string;
  tree_ids: string[];
  primary_name: PersonName;
  alternate_names: PersonName[];
  gender: Gender;
  birth_date_string?: string;
  birth_date_exact?: string;
  birth_place?: string;
  is_birth_date_estimated: boolean;
  death_date_string?: string;
  death_date_exact?: string;
  death_place?: string;
  is_death_date_estimated: boolean;
  is_living: boolean;
  biography?: string;
  notes?: string;
  clan?: string;
  tribe?: string;
  traditional_titles: string[];
  facts: Fact[];
  relationships?: RelationshipSummary[];
}

export interface PersonDetail extends Person {
  relationships: RelationshipSummary[];
}

export interface FamilyTree {
  id: string;
  name: string;
  description?: string;
  root_person_id?: string | null;
  privacy: PrivacySetting;
}

export interface TreeStats {
  tree_id: string;
  persons: number;
  relationships: number;
  sources: number;
}

// ---- Create/update payloads ----

export interface PersonCreate {
  primary_name: PersonName;
  alternate_names?: PersonName[];
  gender?: Gender;
  birth_date_string?: string;
  birth_date_exact?: string;
  birth_place?: string;
  is_birth_date_estimated?: boolean;
  death_date_string?: string;
  death_date_exact?: string;
  death_place?: string;
  is_death_date_estimated?: boolean;
  is_living?: boolean;
  biography?: string;
  notes?: string;
  clan?: string;
  tribe?: string;
  traditional_titles?: string[];
}

export interface FactCreate {
  type: string;
  value: string;
  date_string?: string;
  place?: string;
  description?: string;
  confidence?: Confidence | null;
  source_ids?: string[];
}

export interface SourceCreate {
  title: string;
  type?: SourceType;
  teller?: string;
  date_recorded?: string;
  reference?: string;
  notes?: string;
}

export interface RelationshipCreate {
  person1_id: string;
  person2_id: string;
  relationship_type: RelationshipType;
  spousal_status?: SpousalStatus | null;
  start_date_string?: string;
  place?: string;
  notes?: string;
}

export interface LifeEventCreate {
  event_type: string;
  date_string?: string;
  date_exact?: string;
  place?: string;
  description?: string;
  confidence?: Confidence | null;
  source_ids?: string[];
}

export interface TreeCreate {
  name: string;
  description?: string;
  privacy?: PrivacySetting;
  root_person_id?: string | null;
}

export function displayName(p: { primary_name: PersonName }): string {
  const n = p.primary_name;
  const parts = [n.given_name, n.surname].filter(Boolean);
  return parts.join(" ") || "(unnamed)";
}

export function lifeDates(p: Person): string {
  const b = p.birth_date_string || "";
  const d = p.is_living ? "" : p.death_date_string || "";
  if (!b && !d) return "";
  const birth = b ? (p.is_birth_date_estimated ? `c. ${b}` : b) : "?";
  return p.is_living ? `b. ${birth}` : `${birth} – ${d || "?"}`;
}
