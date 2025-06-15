import { Router } from "express";

const router = Router();

// Placeholder for MFA routes
router.post("/enable", (req, res) => {
  res.status(501).json({
    message: "MFA functionality not yet implemented",
  });
});

router.post("/disable", (req, res) => {
  res.status(501).json({
    message: "MFA functionality not yet implemented",
  });
});

router.post("/verify", (req, res) => {
  res.status(501).json({
    message: "MFA functionality not yet implemented",
  });
});

export const mfaRoutes = router;
