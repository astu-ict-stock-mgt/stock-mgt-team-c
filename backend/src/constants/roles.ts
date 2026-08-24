/**
 * Role constants for type-safe role checks
 * Use these constants instead of magic strings
 */
export const ROLES = {
  ADMINISTRATOR: "ADMINISTRATOR",
  PAO: "PAO",
  STOREKEEPER: "STOREKEEPER",
  STOCK_CLERK: "STOCK_CLERK",
  ACCOUNTANT: "ACCOUNTANT",
  DEPARTMENT_HEAD: "DEPARTMENT_HEAD",
  SECURITY_OFFICER: "SECURITY_OFFICER",
  SUPPLIER: "SUPPLIER",
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];
