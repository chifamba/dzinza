import express, { Response } from "express";
import {
  getUserNotifications,
  markNotificationRead,
} from "../services/notificationService";
import { AuthenticatedRequest } from "../middleware/auth";

const router = express.Router();

// Get notifications for the current user
router.get(
  "/",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const notifications = await getUserNotifications(req.user.id);
      res.json(notifications);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  }
);

// Mark a notification as read
router.post(
  "/:id/read",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      await markNotificationRead(req.params.id);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  }
);

export default router;
