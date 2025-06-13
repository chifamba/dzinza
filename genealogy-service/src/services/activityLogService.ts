import mongoose from 'mongoose';
import { ActivityLog, IActivityLog, ActivityLogActionType } from '../models/ActivityLog';
import { logger } from '@shared/utils/logger'; // Assuming shared logger path

export interface RecordActivityData {
  userId: string;
  actionType: ActivityLogActionType;
  userName?: string;
  familyTreeId?: mongoose.Types.ObjectId | string; // Allow string to be passed, convert to ObjectId if necessary
  targetResourceId?: string;
  targetResourceType?: string;
  targetResourceName?: string;
  changesPreview?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Records an activity log.
 * @param data - The data for the activity log.
 * @returns The created activity log document, or null if an error occurred.
 */
export const recordActivity = async (
  data: RecordActivityData
): Promise<IActivityLog | null> => {
  try {
    const activityData: Partial<IActivityLog> = {
      userId: data.userId,
      actionType: data.actionType,
      userName: data.userName,
      targetResourceId: data.targetResourceId,
      targetResourceType: data.targetResourceType,
      targetResourceName: data.targetResourceName,
      changesPreview: data.changesPreview,
      details: data.details,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    };

    if (data.familyTreeId) {
        if (typeof data.familyTreeId === 'string' && mongoose.Types.ObjectId.isValid(data.familyTreeId)) {
            activityData.familyTreeId = new mongoose.Types.ObjectId(data.familyTreeId);
        } else if (data.familyTreeId instanceof mongoose.Types.ObjectId) {
            activityData.familyTreeId = data.familyTreeId;
        } else if (typeof data.familyTreeId === 'string') { // if it was a string but not valid objectId
            logger.warn(`Invalid familyTreeId format provided to recordActivity: ${data.familyTreeId}. Storing as string if model allows, or it might fail validation.`);
            // If your schema strictly requires ObjectId and you get an invalid string, Mongoose will throw an error on save.
            // Depending on schema definition (if type is `String` for `familyTreeId`), this might be okay.
            // Given current schema is Schema.Types.ObjectId, invalid strings will cause save to fail.
            // For this implementation, we assume valid ObjectId string or ObjectId instance.
        }
    }


    const activityLog = new ActivityLog(activityData);
    await activityLog.save();

    logger.info(`Activity recorded: User ${data.userId} performed action ${data.actionType}`, {
      activityId: activityLog._id,
      userId: data.userId,
      actionType: data.actionType,
      familyTreeId: data.familyTreeId,
      targetResourceId: data.targetResourceId,
    });
    return activityLog;
  } catch (error) {
    logger.error('Error recording activity:', {
      error,
      userId: data.userId,
      actionType: data.actionType,
      familyTreeId: data.familyTreeId,
    });
    return null; // Or throw error if preferred by consuming services
  }
};
