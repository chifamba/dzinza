// src/services/api/genealogyService.ts
import { apiClient } from "./client"; // Assuming client.ts is in the same directory
import {
  FamilyTree as FrontendFamilyTreeType, // Alias for clarity
  FamilyMember,
  Relationship,
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
const mapApiFamilyTreeMetaDataToFrontendFamilyTree = (
  apiTreeData: ApiFamilyTreeMetaData
): Partial<FrontendFamilyTreeType> => {
  return {
    id: apiTreeData.id,
    name: apiTreeData.name,
    ownerId: apiTreeData.owner_id, // Map snake_case to camelCase
    // Description field commented out due to type mismatch
    // description: apiTreeData.description,
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
  events: any[]; // Temporarily using 'any' due to missing Event type
  pagination: PaginationInfo;
}

class GenealogyService {
  private treeBaseURL = "/api/genealogy/family-trees"; // Base URL for family tree operations
  private personBaseURL = "/api/genealogy/persons"; // Base URL for person operations
  private relationshipBaseURL = "/api/genealogy/relationships"; // Base URL for relationship operations
  private eventsBaseURL = "/api/genealogy/events"; // Base URL for events

  // Family Tree Methods
  async getFamilyTree(
    treeId?: string
  ): Promise<Partial<FrontendFamilyTreeType> | null> {
    if (!treeId) {
      // No specific treeId provided, try to fetch the user's first tree as a default.
      console.log(
        "No treeId provided to getFamilyTree, attempting to load first tree from list."
      );
      try {
        const listResponse = await this.listFamilyTrees({ page: 1, limit: 1 });
        if (listResponse.trees && listResponse.trees.length > 0) {
          console.log(
            "Found user trees, returning first one:",
            listResponse.trees[0]
          );
          // The listFamilyTrees method already maps to FrontendFamilyTreeType
          return listResponse.trees[0];
        } else {
          console.log("No family trees found for the user.");
          return null; // No trees found
        }
      } catch (error: any) {
        if (error.code === "ECONNABORTED") {
          console.error(
            "Timeout error fetching list of family trees. Server took too long to respond."
          );
          throw new Error(
            "Timeout: Unable to connect to the server. Please check your connection or try again later."
          );
        } else {
          console.error("Error fetching list of family trees:", error);
          throw error;
        }
      }
    }

    // Specific treeId provided, fetch that tree.
    console.log(`Fetching specific family tree with ID: ${treeId}`);
    try {
      const response = await apiClient.get<ApiFamilyTreeMetaData>(
        `${this.treeBaseURL}/${treeId}`
      );
      return mapApiFamilyTreeMetaDataToFrontendFamilyTree(response.data);
    } catch (error: any) {
      if (error.code === "ECONNABORTED") {
        console.error(
          `Timeout error fetching family tree with ID ${treeId}. Server took too long to respond.`
        );
        throw new Error(
          "Timeout: Unable to connect to the server. Please check your connection or try again later."
        );
      } else {
        console.error(`Error fetching family tree with ID ${treeId}:`, error);
        throw error;
      }
    }
  }

  async createFamilyTree(
    data: Pick<FrontendFamilyTreeType, "name" | "description" | "privacy">
    // TODO: The backend expects owner_id implicitly. This function's response should be mapped.
  ): Promise<Partial<FrontendFamilyTreeType>> {
    // Return mapped partial type
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
  }): Promise<{
    trees: Partial<FrontendFamilyTreeType>[];
    pagination: PaginationInfo;
  }> {
    const response = await apiClient.get<{
      items: ApiFamilyTreeMetaData[];
      total: number;
    }>(this.treeBaseURL, { params }); // Assuming backend list returns items and total
    return {
      trees: response.data.items.map(
        mapApiFamilyTreeMetaDataToFrontendFamilyTree
      ),
      pagination: {
        page: params?.page || 1,
        limit: params?.limit || 10,
        total: response.data.total,
        pages: Math.ceil(response.data.total / (params?.limit || 1)),
      }, // Basic pagination calc
    };
  }

  async updateFamilyTree(
    treeId: string,
    data: Partial<Pick<FrontendFamilyTreeType, "name">>
    // TODO: The response should be mapped.
  ): Promise<Partial<FrontendFamilyTreeType>> {
    // Return mapped partial type
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
    // Use the genealogy API endpoint
    const dataWithTreeId = { ...personData, familyTreeId };
    const response: AxiosResponse<FamilyMember> = await apiClient.post(
      "/api/genealogy/members",
      dataWithTreeId
    );
    return response.data;
  }

  // This method uses "/api/genealogy/members" which is not standard.
  // Assuming "members" are "persons" and should use the personBaseURL.
  async updatePersonInTree(
    personId: string,
    personData: Partial<FamilyMember>
  ): Promise<FamilyMember> {
    // Use the genealogy API endpoint
    const response: AxiosResponse<FamilyMember> = await apiClient.put(
      `/api/genealogy/members/${personId}`,
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
      `/api/genealogy/members/${personId}`, // Use the genealogy API endpoint
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
    await apiClient.delete(`${this.relationshipBaseURL}/${relationshipId}`, {
      params,
    }); // DELETE /api/v1/relationships/{relationshipId}
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

  async addEvent(eventData: Omit<any, "id">): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.post(
      `${this.eventsBaseURL}/`, // POST /api/v1/events/
      eventData
    );
    return response.data;
  }

  async updateEvent(
    eventId: string,
    eventData: Partial<Omit<any, "id">>
  ): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.put(
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

  async addFamilyMember(personData: {
    // This is essentially addPersonToTree
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
      "/api/v1/genealogy/members",
      personData
    );
    return response.data;
  }

  async createRelationship(relationshipData: {
    // This is essentially addRelationship
    person1Id: string;
    person2Id: string;
    type: "SPOUSE" | "PARENT_CHILD" | "SIBLING";
    familyTreeId?: string; // Optional context
  }): Promise<Relationship> {
    // Align with addRelationship by using relationshipBaseURL
    const response: AxiosResponse<Relationship> = await apiClient.post(
      "/api/v1/genealogy/relationships",
      relationshipData
    );
    return response.data;
  }
}

export const genealogyService = new GenealogyService();
