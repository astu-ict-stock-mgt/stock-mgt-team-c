import { Router, Response } from "express";
import { ok } from "../utils/response";
import { asyncHandler, actorOf, requirePermission, AuthedRequest } from "../middleware/auth";
import * as svc from "../services/roles";
import * as val from "../validators";

const router = Router();

router.get("/", requirePermission("roles.read"), asyncHandler(async (_req: AuthedRequest, res: Response) => {
  const items = await svc.listRoles();
  res.json(ok({ items }));
}));

router.post("/", requirePermission("roles.manage"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = val.roleSchema.parse(req.body);
  const role = await svc.createRole(body, actorOf(req));
  res.status(201).json(ok(role, "Role created"));
}));

router.get("/permissions", requirePermission("permissions.read"), asyncHandler(async (_req: AuthedRequest, res: Response) => {
  const result = await svc.listAllPermissions();
  res.json(ok(result));
}));

router.get("/:id", requirePermission("roles.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const role = await svc.getRole(req.params.id);
  res.json(ok(role));
}));

router.patch("/:id", requirePermission("roles.manage"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = val.roleSchema.partial().parse(req.body);
  const role = await svc.updateRole(req.params.id, body, actorOf(req));
  res.json(ok(role, "Role updated"));
}));

router.delete("/:id", requirePermission("roles.manage"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  await svc.deleteRole(req.params.id, actorOf(req));
  res.json(ok({ deleted: true }, "Role deleted"));
}));

router.patch("/:id/permissions", requirePermission("roles.manage"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = val.togglePermissionSchema.parse(req.body);
  const role = await svc.togglePermission(req.params.id, body.permission, body.enable, actorOf(req));
  res.json(ok(role, `Permission ${body.enable ? "granted" : "revoked"}`));
}));

export default router;
