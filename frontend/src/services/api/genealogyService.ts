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
  private treeBaseURL = "/api/family-trees"; // Base URL for family tree operations
  private personBaseURL = "/api/persons"; // Base URL for person operations
  private relationshipBaseURL = "/api/relationships"; // Base URL for relationship operations
  private eventsBaseURL = "/api/events"; // Base URL for events

  // Family Tree Methods
  async getFamilyTree(treeId?: string): Promise<FamilyTree> {
    // New backend API endpoint - gets user's default family tree
    if (!treeId) {
      const response: AxiosResponse<FamilyTree> = await apiClient.get(
        "/api/genealogy/family-tree"
      );
      return response.data;
    }

    // Legacy API endpoint for specific tree ID
    const response: AxiosResponse<FamilyTree> = await apiClient.get(
      `${this.treeBaseURL}/${treeId}`
    );
    return response.data;
  }

  async createFamilyTree(
    data: Pick<FamilyTree, "name" | "description" | "privacy">
  ): Promise<FamilyTree> {
    const response: AxiosResponse<FamilyTree> = await apiClient.post(
      this.treeBaseURL,
      data
    );
    return response.data;
  }

  async listFamilyTrees(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ trees: FamilyTree[]; pagination: PaginationInfo }> {
    const response: AxiosResponse<{
      trees: FamilyTree[];
      pagination: PaginationInfo;
    }> = await apiClient.get(this.treeBaseURL, { params });
    return response.data;
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
    familyTreeId: string,
    search?: string,
    page?: number,
    limit?: number
  ): Promise<PaginatedPersonsResponse> {
    const params: {
      familyTreeId: string;
      page?: number;
      limit?: number;
      search?: string;
    } = { familyTreeId, page, limit };
    if (search) {
      params.search = search;
    }
    // Assuming the backend endpoint is /api/persons and supports these query params
    const response: AxiosResponse<PaginatedPersonsResponse> =
      await apiClient.get(this.personBaseURL, { params });
    return response.data;
  }

  async getPersonDetails(
    personId: string,
    treeId?: string
  ): Promise<FamilyMember> {
    // If treeId is relevant for namespacing or auth, backend should handle it.
    // Endpoint might be /api/persons/:personId or /api/family-trees/:treeId/persons/:personId
    const response: AxiosResponse<FamilyMember> = await apiClient.get(
      `${this.personBaseURL}/${personId}${
        treeId ? `?familyTreeId=${treeId}` : ""
      }`
    );
    return response.data;
  }

  async addPersonToTree(
    familyTreeId: string,
    personData: Omit<
      FamilyMember,
      "id" | "parentIds" | "childIds" | "spouseIds"
    >
  ): Promise<FamilyMember> {
    // Endpoint might be /api/family-trees/:familyTreeId/persons or just /api/persons with familyTreeId in payload
    const response: AxiosResponse<FamilyMember> = await apiClient.post(
      `${this.personBaseURL}`,
      { ...personData, familyTreeId }
    );
    return response.data;
  }

  async updatePersonInTree(
    personId: string,
    personData: Partial<FamilyMember>
  ): Promise<FamilyMember> {
    // familyTreeId might be in personData or not needed if personId is globally unique
    const response: AxiosResponse<FamilyMember> = await apiClient.put(
      `${this.personBaseURL}/${personId}`,
      personData
    );
    return response.data;
  }

  async deletePersonFromTree(
    personId: string,
    familyTreeId?: string
  ): Promise<void> {
    // familyTreeId might be passed as query param or in body if needed by backend for auth/scoping
    await apiClient.delete(
      `${this.personBaseURL}/${personId}${
        familyTreeId ? `?familyTreeId=${familyTreeId}` : ""
      }`
    );
  }

  // Relationship Methods
  async addRelationship(
    relationshipData: Omit<Relationship, "id">
  ): Promise<Relationship> {
    const response: AxiosResponse<Relationship> = await apiClient.post(
      this.relationshipBaseURL,
      relationshipData
    );
    return response.data;
  }

  async deleteRelationship(
    // treeId is often implicit if relationship IDs are global or person IDs are global.
    // If backend requires treeId for auth/scoping, it might be part of the path or query.
    // For now, assuming relationship ID is sufficient or backend resolves tree from person IDs.
    // The previous mock service had person1Id, person2Id, type. A real API might use a relationshipId.
    // Let's assume for now we need to identify relationship by participants and type if no direct ID.
    // This is a placeholder and needs to match the actual backend API for deleting relationships.
    // A more common pattern is DELETE /api/relationships/:relationshipId
    // For this example, I'll assume we need person IDs and type as per the mock structure
    // and that the backend can find the relationship this way.
    // This is NOT a RESTful standard for deletion usually.
    person1Id: string,
    person2Id: string,
    type: Relationship["type"],
    familyTreeId: string // Assuming familyTreeId is needed for context
  ): Promise<void> {
    // This endpoint is hypothetical based on the mock.
    // A real API would likely be DELETE /api/relationships/{relationshipId}
    // Or DELETE /api/family-trees/{treeId}/relationships/{relationshipId}
    // For now, let's assume a custom endpoint or that the backend can figure it out.
    // This is a complex deletion signature.
    await apiClient.delete(this.relationshipBaseURL, {
      data: { person1Id, person2Id, type, familyTreeId },
    });
  }

  // Event Methods
  async getEventsForPerson(
    personId: string,
    familyTreeId?: string,
    page?: number,
    limit?: number
  ): Promise<PaginatedEventsResponse> {
    const params: {
      relatedPersonId: string;
      familyTreeId?: string;
      page?: number;
      limit?: number;
    } = { relatedPersonId: personId, page, limit };
    if (familyTreeId) {
      params.familyTreeId = familyTreeId;
    }
    const response: AxiosResponse<PaginatedEventsResponse> =
      await apiClient.get(this.eventsBaseURL, { params });
    return response.data;
  }

  async addEvent(eventData: Omit<Event, "id">): Promise<Event> {
    const response: AxiosResponse<Event> = await apiClient.post(
      this.eventsBaseURL,
      eventData
    );
    return response.data;
  }

  async updateEvent(
    eventId: string,
    eventData: Partial<Omit<Event, "id">>
  ): Promise<Event> {
    const response: AxiosResponse<Event> = await apiClient.put(
      `${this.eventsBaseURL}/${eventId}`,
      eventData
    );
    return response.data;
  }

  async deleteEvent(eventId: string): Promise<void> {
    await apiClient.delete(`${this.eventsBaseURL}/${eventId}`);
  }

  // New Backend API Methods - Compatible with our genealogy endpoints
  async addFamilyMember(personData: {
    name?: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    gender?: string;
    birthDate?: string;
    deathDate?: string;
    profileImageUrl?: string;
    parentIds?: string[];
  }): Promise<FamilyMember> {
    const response: AxiosResponse<FamilyMember> = await apiClient.post(
      "/api/genealogy/members",
      personData
    );
    return response.data;
  }

  async createRelationship(relationshipData: {
    person1Id: string;
    person2Id: string;
    type: "SPOUSE" | "PARENT_CHILD" | "SIBLING";
  }): Promise<Relationship> {
    const response: AxiosResponse<Relationship> = await apiClient.post(
      "/api/genealogy/relationships",
      relationshipData
    );
    return response.data;
  }
}

export const genealogyService = new GenealogyService();
