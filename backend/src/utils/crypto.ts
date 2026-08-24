import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

// Increased from 10 to 12 for better security (4x harder to crack)
// OWASP recommends 12+ rounds for 2024
const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}
