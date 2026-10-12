// Typed fetch client. All URLs are relative so the same build works in
// dev (vite proxy) and prod (API serves the frontend same-origin).
// Session auth is cookie-based; fetch sends cookies via credentials:"include".

import type {
  Fact,
  FactCreate,
  FamilyTree,
  LifeEvent,
  LifeEventCreate,
  Person,
  PersonCreate,
  PersonDetail,
  Relationship,
  RelationshipCreate,
  RelationshipDetail,
  Source,
  SourceCreate,
  TreeCreate,
  TreeStats,
} from "./types";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: "include",
    headers: body !== undefined ? { "Content-Type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  if (res.status === 401) throw new ApiError(401, "Not authenticated");
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch {
      /* keep statusText */
    }
    throw new ApiError(res.status, String(detail));
  }
  return (await res.json()) as T;
}

const get = <T>(p: string) => request<T>("GET", p);
const post = <T>(p: string, b?: unknown) => request<T>("POST", p, b);
const patch = <T>(p: string, b: unknown) => request<T>("PATCH", p, b);
const del = (p: string) => request<void>("DELETE", p);

export const api = {
  // ---- auth ----
  login: (password: string) => post<{ ok: boolean }>("/auth/login", { password }),
  logout: () => post<{ ok: boolean }>("/auth/logout"),
  me: () => get<{ authenticated: boolean }>("/auth/me"),

  // ---- trees ----
  listTrees: () => get<FamilyTree[]>("/api/trees"),
  createTree: (b: TreeCreate) => post<FamilyTree>("/api/trees", b),
  getTree: (id: string) => get<FamilyTree>(`/api/trees/${id}`),
  updateTree: (id: string, b: Partial<TreeCreate>) =>
    patch<FamilyTree>(`/api/trees/${id}`, b),
  deleteTree: (id: string) => del(`/api/trees/${id}`),
  treeStats: (id: string) => get<TreeStats>(`/api/trees/${id}/stats`),

  // ---- persons ----
  listPersons: (treeId: string) =>
    get<Person[]>(`/api/trees/${treeId}/persons`),
  searchPersons: (treeId: string, q: string) =>
    get<Person[]>(`/api/trees/${treeId}/persons/search?q=${encodeURIComponent(q)}`),
  createPerson: (treeId: string, b: PersonCreate) =>
    post<Person>(`/api/trees/${treeId}/persons`, b),
  getPerson: (id: string) => get<PersonDetail>(`/api/persons/${id}`),
  updatePerson: (id: string, b: Partial<PersonCreate>) =>
    patch<Person>(`/api/persons/${id}`, b),
  deletePerson: (id: string) => del(`/api/persons/${id}`),

  // ---- relationships ----
  listRelationships: (treeId: string) =>
    get<RelationshipDetail[]>(`/api/trees/${treeId}/relationships`),
  createRelationship: (treeId: string, b: RelationshipCreate) =>
    post<Relationship>(`/api/trees/${treeId}/relationships`, b),
  personRelationships: (personId: string) =>
    get<RelationshipDetail[]>(`/api/persons/${personId}/relationships`),
  deleteRelationship: (id: string) => del(`/api/relationships/${id}`),

  // ---- sources ----
  listSources: (treeId: string) => get<Source[]>(`/api/trees/${treeId}/sources`),
  createSource: (treeId: string, b: SourceCreate) =>
    post<Source>(`/api/trees/${treeId}/sources`, b),
  updateSource: (id: string, b: Partial<SourceCreate>) =>
    patch<Source>(`/api/sources/${id}`, b),
  deleteSource: (id: string) => del(`/api/sources/${id}`),

  // ---- facts ----
  listFacts: (personId: string) => get<Fact[]>(`/api/persons/${personId}/facts`),
  createFact: (personId: string, b: FactCreate) =>
    post<Fact>(`/api/persons/${personId}/facts`, b),
  updateFact: (personId: string, factId: string, b: Partial<FactCreate>) =>
    patch<Fact>(`/api/persons/${personId}/facts/${factId}`, b),
  deleteFact: (personId: string, factId: string) =>
    del(`/api/persons/${personId}/facts/${factId}`),

  // ---- events ----
  listEvents: (personId: string) =>
    get<LifeEvent[]>(`/api/persons/${personId}/events`),
  createEvent: (personId: string, b: LifeEventCreate) =>
    post<LifeEvent>(`/api/persons/${personId}/events`, b),
  updateEvent: (id: string, b: Partial<LifeEventCreate>) =>
    patch<LifeEvent>(`/api/events/${id}`, b),
  deleteEvent: (id: string) => del(`/api/events/${id}`),
};
