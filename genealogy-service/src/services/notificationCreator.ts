import { Notification, INotification, NotificationType } from '../models/Notification';
import { logger } from '@shared/utils/logger'; // Assuming shared logger path

interface CreateNotificationData {
  userId: string;
  type: NotificationType; // Use the exported NotificationType
  title: string;
  message?: string;
  link?: string;
  resourceId?: string;
  resourceType?: string;
  actorId?: string;
  actorName?: string;
}

/**
 * Creates and saves a new notification.
 * @param data - The data for the notification to be created.
 * @returns The created notification document, or null if an error occurred.
 */
export const createNotification = async (
  data: CreateNotificationData
): Promise<INotification | null> => {
  try {
    const notification = new Notification({
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      link: data.link,
      resourceId: data.resourceId,
      resourceType: data.resourceType,
      actorId: data.actorId,
      actorName: data.actorName,
      isRead: false, // Default value, also set in schema but explicit here is fine
    });

    await notification.save();
    logger.info(`Notification created successfully for user ${data.userId}, type: ${data.type}, ID: ${notification._id}`);
    return notification;
  } catch (error) {
    logger.error('Error creating notification:', {
      error,
      userId: data.userId,
      type: data.type,
      resourceId: data.resourceId,
      actorId: data.actorId,
    });
    return null; // Or throw error if preferred by consuming services
  }
};
