export interface ServiceConfig {
  name: string;
  url: string;
  healthPath?: string;
  timeout?: number;
}

export const serviceDiscovery: Record<string, ServiceConfig> = {
  auth: {
    name: "auth-service",
    url: process.env.AUTH_SERVICE_URL || "http://localhost:3002",
    healthPath: "/health",
    timeout: 5000,
  },
  genealogy: {
    name: "genealogy-service",
    url: process.env.GENEALOGY_SERVICE_URL || "http://localhost:3003",
    healthPath: "/health",
    timeout: 5000,
  },
  search: {
    name: "search-service",
    url: process.env.SEARCH_SERVICE_URL || "http://localhost:3004",
    healthPath: "/health",
    timeout: 5000,
  },
  storage: {
    name: "storage-service",
    url: process.env.STORAGE_SERVICE_URL || "http://localhost:3005",
    healthPath: "/health",
    timeout: 5000,
  },
};

export default serviceDiscovery;
