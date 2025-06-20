import { Router } from "express";

const router = Router();

// Placeholder for admin routes
router.get("/users", (req, res) => {
  res.status(501).json({
    message: "Admin functionality not yet implemented",
  });
});

router.delete("/users/:id", (req, res) => {
  res.status(501).json({
    message: "Admin functionality not yet implemented",
  });
});

export const adminRoutes = router;
