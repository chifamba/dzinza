import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import fetch from 'node-fetch'; // Ensure node-fetch is a dependency in auth service
import { authMiddleware, AuthenticatedRequest } from '@shared/middleware/auth'; // Adjust path
import { adminAuth } from '@shared/middleware/adminAuth'; // Adjust path
import { logger } from '@shared/utils/logger'; // Adjust path

const router = express.Router();

// Define service URLs - these should ideally come from environment variables
const GENEALOGY_SERVICE_HEALTH_URL = process.env.GENEALOGY_SERVICE_URL
    ? `${process.env.GENEALOGY_SERVICE_URL.replace(/\/api$/, '')}/health`
    : 'http://localhost:3002/health'; // Example default
const SEARCH_SERVICE_HEALTH_URL = process.env.SEARCH_SERVICE_URL
    ? `${process.env.SEARCH_SERVICE_URL.replace(/\/api$/, '')}/health`
    : 'http://localhost:3003/health'; // Example default
// const STORAGE_SERVICE_HEALTH_URL = process.env.STORAGE_SERVICE_URL ? `${process.env.STORAGE_SERVICE_URL}/health` : 'http://localhost:3004/health';


interface ServiceHealth {
    name: string;
    status: 'UP' | 'DOWN' | 'UNKNOWN';
    details?: any; // To store the response or error message
}

const checkServiceHealth = async (serviceName: string, url: string): Promise<ServiceHealth> => {
    try {
        const response = await fetch(url, { timeout: 5000 }); // 5s timeout
        const data = await response.json();
        if (!response.ok || (data && data.status !== "UP")) {
            return { name: serviceName, status: "DOWN", details: data || { message: `Status ${response.status}` } };
        }
        return { name: serviceName, status: "UP", details: data };
    } catch (error: any) {
        logger.warn(`Failed to fetch health from ${serviceName} at ${url}:`, error.message);
        return { name: serviceName, status: "UNKNOWN", details: { reason: error.message } };
    }
};

router.get(
    '/system-health', // Will be mounted at /api/admin/system-health
    authMiddleware,
    adminAuth,
    async (req: AuthenticatedRequest, res: Response) => {
        const timestamp = new Date().toISOString();
        const servicesHealth: ServiceHealth[] = [];

        // 1. Auth Service's own DB health
        let authDbStatus = "DOWN";
        let authDbReason = "Database disconnected";
        try {
            if (mongoose.connection.readyState === 1) {
                authDbStatus = "UP";
                authDbReason = "";
            } else {
                authDbReason = `Database in readyState: ${mongoose.connection.readyState}`;
            }
        } catch (error: any) {
            authDbReason = error.message || "Database check failed";
        }
        servicesHealth.push({
            name: "auth-service",
            status: authDbStatus === "UP" ? "UP" : "DOWN",
            details: { dependencies: { database: { status: authDbStatus, reason: authDbReason || undefined } } }
        });

        // 2. Genealogy Service health
        servicesHealth.push(await checkServiceHealth("genealogy-service", GENEALOGY_SERVICE_HEALTH_URL));

        // 3. Search Service health
        servicesHealth.push(await checkServiceHealth("search-service", SEARCH_SERVICE_HEALTH_URL));

        // 4. (Optional) Storage Service health
        // servicesHealth.push(await checkServiceHealth("storage-service", STORAGE_SERVICE_HEALTH_URL));

        let overallStatus: 'UP' | 'DEGRADED' | 'DOWN' = 'UP';
        const downOrUnknownServices = servicesHealth.filter(s => s.status === 'DOWN' || s.status === 'UNKNOWN');

        if (downOrUnknownServices.length > 0) {
            if (downOrUnknownServices.length === servicesHealth.length) {
                overallStatus = 'DOWN'; // All critical services are down/unknown
            } else {
                overallStatus = 'DEGRADED'; // Some services are down/unknown
            }
        }
        // Could refine overallStatus: if auth-service itself is down, overall is DOWN.
        if (authDbStatus === "DOWN") {
            overallStatus = "DEGRADED"; // Or DOWN if auth is most critical
        }

        // More sophisticated: define which services are "critical"
        const criticalServices = ["auth-service", "genealogy-service"]; // Example
        const criticalDown = servicesHealth.filter(s => criticalServices.includes(s.name) && (s.status === "DOWN" || s.status === "UNKNOWN"));
        if (criticalDown.length > 0) {
            overallStatus = overallStatus === "DOWN" ? "DOWN" : "DEGRADED"; // If already all down, keep it. Otherwise, degrade.
            if (criticalDown.some(s => s.name === "auth-service")) { // If auth is down, system is effectively down for users
                // overallStatus = "DOWN"; // Or keep as degraded if other parts might still function for some users
            }
        }


        res.status(overallStatus === "DOWN" ? 503 : 200).json({
            overallStatus,
            timestamp,
            services: servicesHealth,
        });
    }
);

export default router;
