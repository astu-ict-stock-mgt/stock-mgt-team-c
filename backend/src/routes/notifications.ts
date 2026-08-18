import { Router, Response } from "express";
import { ok } from "../utils/response";
import { asyncHandler, requireAuth, AuthedRequest } from "../middleware/auth";
import { getNotificationsForUser } from "../services/notifications";

const router = Router();

router.get("/", requireAuth, asyncHandler(async (req: AuthedRequest, res: Response) => {
  const result = await getNotificationsForUser(req.userId!, req.roles, req.permissions);
  res.json(ok(result));
}));

export default router;
