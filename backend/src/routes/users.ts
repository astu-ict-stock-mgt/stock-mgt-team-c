import { Router, Request, Response } from "express";
import { prisma } from "../config/db";
import { ok, fail, paginate } from "../utils/response";
import { AppError, Errors } from "../utils/errors";
import { asyncHandler, requirePermission, requireAuth, AuthedRequest } from "../middleware/auth";
import { qp, qpPage, qpLimit } from "../utils/query";
import * as svc from "../services/users";
import * as val from "../validators";

const router = Router();

router.get("/", requirePermission("users.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const params = {
    page: qpPage(req), limit: qpLimit(req, 20),
    search: qp(req, "search"), status: qp(req, "status"), roleId: qp(req, "roleId"),
  };
  const result = await svc.listUsers(params);
  res.json(ok(paginate(result.items, result.total, params.page, params.limit)));
}));

router.post("/", requirePermission("users.create"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = val.createUserSchema.parse(req.body);
  const user = await svc.createUser(body, { userId: req.userId });
  res.status(201).json(ok(user, "User created", ) as any);
}));

router.get("/:id", requirePermission("users.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const user = await svc.getUser(req.params.id);
  res.json(ok(user));
}));

router.patch("/:id", requirePermission("users.update"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = val.updateUserSchema.parse(req.body);
  const user = await svc.updateUser(req.params.id, body, { userId: req.userId, ip: (req as any)._clientIp });
  res.json(ok(user, "User updated"));
}));

// Clears a lockout so the account can log in again. Nothing else in the API
// could do this, which made a locked-out administrator unrecoverable.
router.post("/:id/unlock", requirePermission("users.update"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  await svc.unlockUser(req.params.id, { userId: req.userId, ip: (req as any)._clientIp });
  res.json(ok({ unlocked: true }, "User unlocked"));
}));

// Admin-initiated password reset: also clears the lockout and ends all of the
// user's sessions, so a forgotten password no longer needs DB surgery.
router.post("/:id/reset-password", requirePermission("users.update"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = val.resetPasswordSchema.parse(req.body);
  await svc.resetUserPassword(req.params.id, body.newPassword, { userId: req.userId, ip: (req as any)._clientIp });
  res.json(ok({ reset: true }, "Password reset — the user must sign in again"));
}));

router.delete("/:id", requirePermission("users.delete"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  await svc.deleteUser(req.params.id, { userId: req.userId, ip: (req as any)._clientIp });
  res.json(ok({ deleted: true }, "User deleted"));
}));

export default router;
