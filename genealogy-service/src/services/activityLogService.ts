import { logger } from "../utils/logger";

/**
 * Record an activity log event. This is a stub implementation.
 * @param userId - The user performing the action
 * @param action - The action performed
 * @param details - Additional details (optional)
 */
export async function recordActivity(
  userId: string,
  action: string,
  details?: Record<string, any>
) {
  logger.info("ActivityLog", { userId, action, ...details });
  // In a real implementation, this would save to a database collection
  return Promise.resolve();
}
