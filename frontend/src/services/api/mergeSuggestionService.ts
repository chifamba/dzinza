import { apiClient } from "./client";
import { AxiosResponse } from "axios";

export interface MergeSuggestion {
  _id: string;
  newPersonId: string;
  existingPersonId: string;
  confidence: number;
  status: "pending" | "accepted" | "declined";
  createdBy?: string;
  notifiedUsers: string[];
  previewTree?: any;
  createdAt: string;
  updatedAt: string;
}

export interface PersonHistoryEntry {
  _id: string;
  personId: string;
  version: number;
  data: any;
  changedBy: string;
  changeType: string;
  createdAt: string;
}

export class MergeSuggestionService {
  async listMergeSuggestions(): Promise<MergeSuggestion[]> {
    const response: AxiosResponse<MergeSuggestion[]> = await apiClient.get(
      "/api/merge-suggestions"
    );
    return response.data;
  }

  async acceptMergeSuggestion(id: string): Promise<void> {
    await apiClient.post(`/api/merge-suggestions/${id}/accept`);
  }

  async declineMergeSuggestion(id: string): Promise<void> {
    await apiClient.post(`/api/merge-suggestions/${id}/decline`);
  }

  async getPersonHistory(personId: string): Promise<PersonHistoryEntry[]> {
    const response: AxiosResponse<PersonHistoryEntry[]> = await apiClient.get(
      `/api/genealogy/persons/${personId}/history`
    );
    return response.data;
  }

  async revertPerson(personId: string, version: number): Promise<void> {
    await apiClient.post(`/api/genealogy/persons/${personId}/revert`, {
      version,
    });
  }
}

export const mergeSuggestionService = new MergeSuggestionService();
