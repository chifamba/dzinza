// src/services/api/genealogyService.ts
import { apiClient } from "./client"; // Assuming client.ts is in the same directory
import {
  FamilyTree as FrontendFamilyTreeType, // Alias for clarity
  FamilyMember,
  Relationship,
  Event,
} from "../../types/genealogy"; // Adjust path as needed
import { AxiosResponse } from "axios";

// Represents the data structure from GET /api/v1/family-trees/{tree_id}
// and potentially GET /api/v1/genealogy/family-tree
interface ApiFamilyTreeMetaData {
  id: string;
  name: string;
  owner_id: string; // snake_case from backend
  description?: string;
  privacy?: string;
  // Add other relevant metadata fields from backend's FamilyTreeRead/models_main.FamilyTree if needed
  // e.g. settings, statistics objects if they are returned.
}

// Maps backend FamilyTreeRead (metadata only) to the frontend FamilyTree type (metadata part)
const mapApiFamilyTreeMetaDataToFrontendFamilyTree = (apiTreeData: ApiFamilyTreeMetaData): Partial<FrontendFamilyTreeType> => {
  return {
    id: apiTreeData.id,
    name: apiTreeData.name,
    ownerId: apiTreeData.owner_id, // Map snake_case to camelCase
    description: apiTreeData.description,
    // members and relationships would be empty or undefined here,
    // as this function only maps the metadata from the specific backend endpoint.
    // The frontend will need to fetch these separately if this model is used directly.
    members: [], // Default to empty, actual population requires separate calls
    relationships: [], // Default to empty
    // Map other fields like privacy, settings, statistics if they are part of ApiFamilyTreeMetaData
    // and FrontendFamilyTreeType
  };
};

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
  private treeBaseURL = "/api/v1/family-trees"; // Base URL for family tree operations
  private personBaseURL = "/api/v1/persons"; // Base URL for person operations
  private relationshipBaseURL = "/api/v1/relationships"; // Base URL for relationship operations
  private eventsBaseURL = "/api/v1/events"; // Base URL for events

  // Family Tree Methods
  async getFamilyTree(treeId?: string): Promise<Partial<FrontendFamilyTreeType>> {
    // New backend API endpoint - gets user's default family tree
    if (!treeId) {
      // This path /api/v1/genealogy/family-tree needs to be defined in backend.
      // Assuming it would also return ApiFamilyTreeMetaData like structure for the default tree.
      const response = await apiClient.get<ApiFamilyTreeMetaData>(
        "/api/v1/genealogy/family-tree"
      );
      return mapApiFamilyTreeMetaDataToFrontendFamilyTree(response.data);
    }

    // API endpoint for specific tree ID (returns metadata only)
    const response = await apiClient.get<ApiFamilyTreeMetaData>(
      `${this.treeBaseURL}/${treeId}` // treeBaseURL is /api/v1/family-trees
    );
    return mapApiFamilyTreeMetaDataToFrontendFamilyTree(response.data);
  }

  async createFamilyTree(
    data: Pick<FrontendFamilyTreeType, "name" | "description" | "privacy">
    // TODO: The backend expects owner_id implicitly. This function's response should be mapped.
  ): Promise<Partial<FrontendFamilyTreeType>> { // Return mapped partial type
    const response = await apiClient.post<ApiFamilyTreeMetaData>( // Assuming backend create returns metadata similar to read
      this.treeBaseURL,
      data
    );
    return mapApiFamilyTreeMetaDataToFrontendFamilyTree(response.data);
  }

  async listFamilyTrees(params?: {
    page?: number;
    limit?: number;
    search?: string;
    // TODO: The response items here are likely ApiFamilyTreeMetaData[], map them.
  }): Promise<{ trees: Partial<FrontendFamilyTreeType>[]; pagination: PaginationInfo }> {
    const response = await apiClient.get<{ items: ApiFamilyTreeMetaData[]; total: number }>( // Assuming backend list returns items and total
      this.treeBaseURL, { params }
    );
    return {
      trees: response.data.items.map(mapApiFamilyTreeMetaDataToFrontendFamilyTree),
      pagination: { ...params, total: response.data.total, pages: Math.ceil(response.data.total / (params?.limit || 1)) } // Basic pagination calc
    };
  }

  async updateFamilyTree(
    treeId: string,
    data: Partial<
      Pick<FrontendFamilyTreeType, "name" | "description" | "privacy" | "settings">
    >
    // TODO: The response should be mapped.
  ): Promise<Partial<FrontendFamilyTreeType>> { // Return mapped partial type
    const response = await apiClient.put<ApiFamilyTreeMetaData>( // Assuming backend update returns metadata similar to read
      `${this.treeBaseURL}/${treeId}`,
      data
    );
    return mapApiFamilyTreeMetaDataToFrontendFamilyTree(response.data);
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
    // Corrected path to use the endpoint for creating a person within a specific tree
    const response: AxiosResponse<FamilyMember> = await apiClient.post(
      `/api/v1/trees/${familyTreeId}/persons`,
      personData
    );
    return response.data;
  }

  async updatePersonInTree(
    personId: string,
    personData: Partial<FamilyMember>
  ): Promise<FamilyMember> {
    // Corrected path to use the endpoint for updating a specific person
    const response: AxiosResponse<FamilyMember> = await apiClient.put(
      `/api/v1/persons/${personId}`,
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
  }): Promise<FamilyMember> {
    const response: AxiosResponse<FamilyMember> = await apiClient.post(
      "/api/v1/genealogy/members",
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
      "/api/v1/genealogy/relationships",
      relationshipData
    );
    return response.data;
  }
}

export const genealogyService = new GenealogyService();
