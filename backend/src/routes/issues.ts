import { Router, Response } from "express";
import { fail } from "../utils/response";
import { asyncHandler, AuthedRequest } from "../middleware/auth";

const router = Router();

const notImplemented = asyncHandler(async (req: AuthedRequest, res: Response) => {
  res.status(501).json(fail("NOT_IMPLEMENTED", "Issuing workflow pending Phase 4"));
});

router.get("/", notImplemented);
router.post("/", notImplemented);
router.get("/:id", notImplemented);
router.patch("/:id/approve", notImplemented);
router.patch("/:id/reject", notImplemented);

export default router;
