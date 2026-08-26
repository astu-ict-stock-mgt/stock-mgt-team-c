"use client";

import { create } from "zustand";

export type Section =
  | "dashboard"
  | "inventory"
  | "suppliers"
  | "categories"
  | "stores"
  | "receipts"
  | "issues"
  | "transfers"
  | "requisitions"
  | "reports"
  | "audit-logs"
  | "users"
  | "roles"
  | "settings";

type UIState = {
  section: Section;
  setSection: (s: Section) => void;
  selectedItemId: string | null;
  setSelectedItemId: (id: string | null) => void;
  notificationTarget: string | null;
  setNotificationTarget: (target: string | null) => void;
  issueDraftRequisition: {
    id: string;
    code: string;
    department: string;
    notes?: string | null;
    items: Array<{ itemId: string; quantity: number; itemCode?: string; itemName?: string }>;
  } | null;
  setIssueDraftRequisition: (draft: UIState["issueDraftRequisition"]) => void;
  settingsTab: "profile" | "security" | "system";
  setSettingsTab: (t: "profile" | "security" | "system") => void;
};

// NOTE: No persist middleware — Zustand persistence causes SSR/CSR hydration
// mismatches in Next.js App Router because the server renders with default
// state while the client restores from localStorage.
export const useUIStore = create<UIState>((set) => ({
  section: "dashboard",
  setSection: (section) => set({ section, selectedItemId: null }),
  selectedItemId: null,
  setSelectedItemId: (selectedItemId) => set({ selectedItemId }),
  notificationTarget: null,
  setNotificationTarget: (notificationTarget) => set({ notificationTarget }),
  issueDraftRequisition: null,
  setIssueDraftRequisition: (issueDraftRequisition) => set({ issueDraftRequisition }),
  settingsTab: "profile",
  setSettingsTab: (settingsTab) => set({ settingsTab }),
}));
