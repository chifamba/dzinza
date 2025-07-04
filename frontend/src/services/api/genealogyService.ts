// src/services/api/genealogyService.ts
import { apiClient } from "./client"; // Assuming client.ts is in the same directory
import {
  FamilyTree,
  FamilyMember,
  Relationship,
  Event,
} from "../../types/genealogy"; // Adjust path as needed
import { AxiosResponse } from "axios";

// Define response structure for paginated persons if not already defined elsewhere
export interface PaginatedPersonsResponse {
  persons: FamilyMember[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PaginatedEventsResponse {
  events: Event[];
  pagination: PaginationInfo;
}

class GenealogyService {
  // Corrected base URLs to include /api/v1/ prefix for the gateway
  private treeBaseURL = "/api/v1/family-trees";
  private personBaseURL = "/api/v1/persons";
  private relationshipBaseURL = "/api/v1/relationships";
  private eventsBaseURL = "/api/v1/events";

  // Family Tree Methods
  async getFamilyTree(treeId?: string): Promise<FamilyTree | null> {
    if (!treeId) {
      // Fetch the list of family trees.
      // The backend's read_family_trees in family_tree.py returns: {"items": trees, "total": -1}
      // or a proper FamilyTreeList if pagination is fully implemented.
      // Assuming FamilyTreeList has an 'items' property.
      const response: AxiosResponse<{ items: FamilyTree[]; total: number } | FamilyTree[]> =
        await apiClient.get(`${this.treeBaseURL}/`); // GET /api/v1/family-trees/

      const trees = Array.isArray(response.data) ? response.data : response.data.items;

      if (trees && trees.length > 0) {
        return trees[0]; // Return the first tree as "default"
      }
      return null; // No trees found
    }

    // Fetch specific tree ID
    const response: AxiosResponse<FamilyTree> = await apiClient.get(
      `${this.treeBaseURL}/${treeId}` // e.g. GET /api/v1/family-trees/{treeId}
    );
    return response.data;
  }

  async createFamilyTree(
    data: Pick<FamilyTree, "name" | "description" | "privacy">
  ): Promise<FamilyTree> {
    const response: AxiosResponse<FamilyTree> = await apiClient.post(
      `${this.treeBaseURL}/`, // Ensure trailing slash if backend expects it for POST to collection
      data
    );
    return response.data;
  }

  async listFamilyTrees(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ trees: FamilyTree[]; pagination: PaginationInfo }> {
    // Assuming backend returns { items: FamilyTree[], total: number } or similar
    // and we adapt it or the backend matches this structure.
    // For now, let's assume the backend might return items directly or nested.
    // The FamilyTreeList schema in family_tree.py was:
    // return {"items": trees, "total": -1}
    // So, this matches { items: FamilyTree[], total: number }
    const response: AxiosResponse<{ items: FamilyTree[]; total: number; pagination?: PaginationInfo }> = // pagination might be calculated or passed
      await apiClient.get(`${this.treeBaseURL}/`, { params });

    // Adapt if backend doesn't provide pagination info directly in this format
    return {
        trees: response.data.items,
        pagination: response.data.pagination || {
            page: params?.page || 1,
            limit: params?.limit || 0,
            total: response.data.total,
            pages: response.data.total > 0 && params?.limit ? Math.ceil(response.data.total / params.limit) : 1
        }
    };
  }

  async updateFamilyTree(
    treeId: string,
    data: Partial<
      Pick<FamilyTree, "name" | "description" | "privacy" | "settings">
    >
  ): Promise<FamilyTree> {
    const response: AxiosResponse<FamilyTree> = await apiClient.put(
      `${this.treeBaseURL}/${treeId}`,
      data
    );
    return response.data;
  }

  async deleteFamilyTree(treeId: string): Promise<void> {
    await apiClient.delete(`${this.treeBaseURL}/${treeId}`);
  }

  // Person Methods
  async getPersons(
    familyTreeId: string, // This might be a query param for filtering persons by tree
    search?: string,
    page?: number,
    limit?: number
  ): Promise<PaginatedPersonsResponse> {
    const params: {
      familyTreeId?: string; // Changed to optional as persons might be global or filtered
      page?: number;
      limit?: number;
      search?: string;
    } = { page, limit };
    if (familyTreeId) params.familyTreeId = familyTreeId; // Add if provided
    if (search) params.search = search;

    // Endpoint for persons: /api/v1/persons
    // Query params like familyTreeId, search, page, limit should be handled by backend.
    const response: AxiosResponse<PaginatedPersonsResponse> =
      await apiClient.get(`${this.personBaseURL}/`, { params }); // GET /api/v1/persons/
    return response.data;
  }

  async getPersonDetails(
    personId: string,
    treeId?: string // Optional treeId for context if needed by backend
  ): Promise<FamilyMember> {
    const params = treeId ? { familyTreeId: treeId } : {};
    const response: AxiosResponse<FamilyMember> = await apiClient.get(
      `${this.personBaseURL}/${personId}`, // GET /api/v1/persons/{personId}
      { params }
    );
    return response.data;
  }

  // This method uses "/api/genealogy/members" which is not standard.
  // Assuming "members" are "persons" and should use the personBaseURL.
  async addPersonToTree(
    familyTreeId: string, // May be used in personData or as a query param if API supports it
    personData: Omit<
      FamilyMember,
      "id" | "parentIds" | "childIds" | "spouseIds"
    > & { familyTreeId?: string } // Allow familyTreeId in personData
  ): Promise<FamilyMember> {
    // If familyTreeId needs to be part of the personData for the backend:
    if (!personData.familyTreeId && familyTreeId) {
        (personData as FamilyMember).familyTreeId = familyTreeId;
    }
    const response: AxiosResponse<FamilyMember> = await apiClient.post(
      `${this.personBaseURL}/`, // POST /api/v1/persons/
      personData
    );
    return response.data;
  }

  // This method uses "/api/genealogy/members" which is not standard.
  // Assuming "members" are "persons" and should use the personBaseURL.
  async updatePersonInTree(
    personId: string,
    personData: Partial<FamilyMember>
  ): Promise<FamilyMember> {
    const response: AxiosResponse<FamilyMember> = await apiClient.put(
      `${this.personBaseURL}/${personId}`, // PUT /api/v1/persons/{personId}
      personData
    );
    return response.data;
  }

  async deletePersonFromTree(
    personId: string,
    familyTreeId?: string // Optional: for context or if backend requires it as query param
  ): Promise<void> {
    const params = familyTreeId ? { familyTreeId: familyTreeId } : {};
    await apiClient.delete(
      `${this.personBaseURL}/${personId}`, // DELETE /api/v1/persons/{personId}
      { params }
    );
  }

  // Relationship Methods
  async addRelationship(
    relationshipData: Omit<Relationship, "id">
  ): Promise<Relationship> {
    const response: AxiosResponse<Relationship> = await apiClient.post(
      `${this.relationshipBaseURL}/`, // POST /api/v1/relationships/
      relationshipData
    );
    return response.data;
  }

  async deleteRelationship(
    relationshipId: string, // Standard RESTful way is by ID
    familyTreeId?: string // Optional context
  ): Promise<void> {
     const params = familyTreeId ? { familyTreeId: familyTreeId } : {};
    await apiClient.delete(`${this.relationshipBaseURL}/${relationshipId}`, { params }); // DELETE /api/v1/relationships/{relationshipId}
  }

  // Event Methods
  async getEventsForPerson(
    personId: string, // This implies filtering events by a person
    familyTreeId?: string,
    page?: number,
    limit?: number
  ): Promise<PaginatedEventsResponse> {
    const params: {
      relatedPersonId?: string; // Backend should know how to filter by this
      familyTreeId?: string;
      page?: number;
      limit?: number;
    } = { page, limit };
    if (personId) params.relatedPersonId = personId;
    if (familyTreeId) params.familyTreeId = familyTreeId;

    const response: AxiosResponse<PaginatedEventsResponse> =
      await apiClient.get(`${this.eventsBaseURL}/`, { params }); // GET /api/v1/events/
    return response.data;
  }

  async addEvent(eventData: Omit<Event, "id">): Promise<Event> {
    const response: AxiosResponse<Event> = await apiClient.post(
      `${this.eventsBaseURL}/`, // POST /api/v1/events/
      eventData
    );
    return response.data;
  }

  async updateEvent(
    eventId: string,
    eventData: Partial<Omit<Event, "id">>
  ): Promise<Event> {
    const response: AxiosResponse<Event> = await apiClient.put(
      `${this.eventsBaseURL}/${eventId}`, // PUT /api/v1/events/{eventId}
      eventData
    );
    return response.data;
  }

  async deleteEvent(eventId: string): Promise<void> {
    await apiClient.delete(`${this.eventsBaseURL}/${eventId}`); // DELETE /api/v1/events/{eventId}
  }

  // New Backend API Methods - Compatible with our genealogy endpoints
  // These methods seem redundant if the above are corrected to use standard REST paths.
  // For example, addFamilyMember can be addPersonToTree if paths are aligned.
  // I will assume these were attempts to use different paths and will align them with the
  // personBaseURL and relationshipBaseURL.

  async addFamilyMember(personData: { // This is essentially addPersonToTree
    name?: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    gender?: string;
    birthDate?: string;
    deathDate?: string;
    placeOfBirth?: string;
    placeOfDeath?: string;
    occupation?: string;
    biography?: string;
    notes?: string;
    profileImageUrl?: string;
    parentIds?: string[];
    phoneNumbers?: any[];
    emailAddresses?: any[];
    addresses?: any[];
    familyTreeId?: string; // Ensure familyTreeId can be passed
  }): Promise<FamilyMember> {
    // Align with addPersonToTree by using personBaseURL
    // familyTreeId might be part of personData or a query param, depends on backend.
    // Let's assume it's part of personData for this example if backend supports it.
    const response: AxiosResponse<FamilyMember> = await apiClient.post(
      `${this.personBaseURL}/`, // POST /api/v1/persons/
      personData
    );
    return response.data;
  }

  async createRelationship(relationshipData: { // This is essentially addRelationship
    person1Id: string;
    person2Id: string;
    type: "SPOUSE" | "PARENT_CHILD" | "SIBLING";
    familyTreeId?: string; // Optional context
  }): Promise<Relationship> {
    // Align with addRelationship by using relationshipBaseURL
    const response: AxiosResponse<Relationship> = await apiClient.post(
      `${this.relationshipBaseURL}/`, // POST /api/v1/relationships/
      relationshipData
    );
    return response.data;
  }
}

export const genealogyService = new GenealogyService();
