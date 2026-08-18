import { Router, Response, Request } from "express";
import { ok, fail } from "../utils/response";
import { asyncHandler, AuthedRequest } from "../middleware/auth";
import { login, logout, changePassword } from "../services/auth";
import { publicUser } from "../services/auth";
import * as val from "../validators";
import { Errors } from "../utils/errors";

const router = Router();

router.post("/login", asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = val.loginSchema.parse(req.body);
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? (req as any)._clientIp;
  const result = await login(body.email, body.password, ip);
  res.json(ok(result, "Login successful"));
}));

router.post("/logout", asyncHandler(async (req: Request, res: Response) => {
  const auth = req.headers.authorization || "";
  const headerToken = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  let bodyToken: string | undefined;
  try { bodyToken = (req.body as any)?.token; } catch {}
  const token = bodyToken ?? headerToken ?? "";
  await logout(token);
  res.json(ok({ loggedOut: true }, "Logout successful"));
}));

router.post("/change-password", asyncHandler(async (req: AuthedRequest, res: Response) => {
  if (!req.userId) throw Errors.unauthorized();
  const body = val.changePasswordSchema.parse(req.body);
  await changePassword(req.userId, body.currentPassword, body.newPassword);
  res.json(ok({ changed: true }, "Password changed successfully"));
}));

router.get("/me", asyncHandler(async (req: AuthedRequest, res: Response) => {
  if (!req.userId) throw Errors.unauthorized();
  res.json(ok({ user: req.user, permissions: Array.from(req.permissions), roles: Array.from(req.roles) }));
}));

router.get("/profile", asyncHandler(async (req: AuthedRequest, res: Response) => {
  if (!req.userId) throw Errors.unauthorized();
  res.json(ok({ user: req.user }));
}));

router.patch("/profile", asyncHandler(async (req: AuthedRequest, res: Response) => {
  if (!req.userId) throw Errors.unauthorized();
  const body = val.profileSchema.parse(req.body);
  const { prisma } = await import("../config/db");
  const existing = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!existing) throw Errors.notFound("User");
  const data: any = {};
  if (body.fullName !== undefined) data.fullName = body.fullName;
  if (body.department !== undefined) data.department = body.department;
  if (body.phoneNumber !== undefined) data.phoneNumber = body.phoneNumber;
  const updated = await prisma.user.update({
    where: { id: req.userId }, data,
    include: { userRoles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
  });
  res.json(ok({ user: publicUser(updated) }, "Profile updated"));
}));

export default router;
