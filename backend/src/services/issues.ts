import { Errors } from "../utils/errors";

// Legacy issues logic depends on old StockIssue models.
// Pending Phase 4 implementation for Requisition -> SIV workflow.

export async function createIssue(data: any, ctx: any) {
  throw Errors.notImplemented("Issuing workflow pending Phase 4");
}

export async function approveIssue(id: string, ctx: any) {
  throw Errors.notImplemented("Issuing workflow pending Phase 4");
}

export async function rejectIssue(id: string, reason: string, ctx: any) {
  throw Errors.notImplemented("Issuing workflow pending Phase 4");
}

export async function listIssues(params: any = {}) {
  throw Errors.notImplemented("Issuing workflow pending Phase 4");
}

export async function getIssue(id: string) {
  throw Errors.notImplemented("Issuing workflow pending Phase 4");
}
