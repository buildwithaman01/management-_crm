import { FollowUp } from "@/types/entities";
import { GoogleSheetsAdapter } from "@/lib/google-sheets/adapter";
import { InMemoryRepo } from "@/lib/repository/in-memory-repo";
import { generateId } from "@/lib/id-generator";

// In-memory singleton store for test/dev fallback
export const inMemoryFollowupsRepo = new InMemoryRepo<FollowUp>("followup_id");

export function isGoogleSheetsConfigured(): boolean {
  return Boolean(
    process.env.SPREADSHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  );
}

export interface FollowupFilterOptions {
  status?: string | null;
  entity_type?: string | null;
  related_type?: string | null;
  priority?: string | null;
  overdue?: boolean | null;
  related_id?: string | null;
  tab?: string | null;
  q?: string | null;
}

/**
 * Reads all follow-ups with optional filtering
 */
export async function getFollowups(
  options: FollowupFilterOptions = {}
): Promise<FollowUp[]> {
  let all: FollowUp[] = [];

  if (isGoogleSheetsConfigured()) {
    try {
      const adapter = new GoogleSheetsAdapter();
      all = await adapter.readTab<FollowUp>("FollowUps", {
        skipCache: true,
      });
    } catch {
      all = await inMemoryFollowupsRepo.list();
    }
  } else {
    all = await inMemoryFollowupsRepo.list();
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfToday = startOfToday + 24 * 60 * 60 * 1000 - 1;

  return all.filter((item) => {
    // Overdue filter
    if (options.overdue === true) {
      if (item.status !== "OPEN") return false;
      const dueTime = new Date(item.due_at).getTime();
      if (isNaN(dueTime) || dueTime >= now.getTime()) return false;
    }

    // Tab filter
    if (options.tab) {
      const tab = options.tab.toLowerCase();
      const dueTime = new Date(item.due_at).getTime();
      if (tab === "overdue") {
        if (item.status !== "OPEN" || isNaN(dueTime) || dueTime >= now.getTime()) {
          return false;
        }
      } else if (tab === "today") {
        if (item.status !== "OPEN" || isNaN(dueTime) || dueTime < startOfToday || dueTime > endOfToday) {
          return false;
        }
      } else if (tab === "upcoming") {
        if (item.status !== "OPEN" || isNaN(dueTime) || dueTime <= endOfToday) {
          return false;
        }
      } else if (tab === "completed" || tab === "done") {
        if (item.status !== "DONE") return false;
      }
    }

    // Status filter
    if (options.status && options.status !== "ALL") {
      if (item.status !== options.status) return false;
    }

    // Entity type / related type filter
    const entityType = options.entity_type || options.related_type;
    if (entityType && entityType !== "ALL") {
      if (item.related_type?.toUpperCase() !== entityType.toUpperCase()) {
        return false;
      }
    }

    // Priority filter
    if (options.priority && options.priority !== "ALL") {
      if (item.priority?.toUpperCase() !== options.priority.toUpperCase()) {
        return false;
      }
    }

    // Related ID filter
    if (options.related_id) {
      if (item.related_id !== options.related_id) return false;
    }

    // Search query
    if (options.q && options.q.trim()) {
      const q = options.q.toLowerCase().trim();
      const matchDesc = item.description?.toLowerCase().includes(q);
      const matchId = item.followup_id?.toLowerCase().includes(q);
      const matchRel = item.related_id?.toLowerCase().includes(q);
      const matchType = item.followup_type?.toLowerCase().includes(q);
      if (!matchDesc && !matchId && !matchRel && !matchType) return false;
    }

    return true;
  });
}

/**
 * Creates a new follow-up
 */
export async function createFollowup(data: {
  related_type: "STUDENT" | "TUTOR" | "ASSIGNMENT";
  related_id: string;
  due_at: string;
  followup_type: string;
  description: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  assigned_admin?: string;
  status?: "OPEN" | "DONE" | "CANCELLED";
}): Promise<FollowUp> {
  const followupId = generateId("FOL");
  const now = new Date().toISOString();

  const newFollowup: FollowUp = {
    followup_id: followupId,
    related_type: data.related_type,
    related_id: data.related_id,
    due_at: data.due_at,
    followup_type: data.followup_type,
    description: data.description,
    status: data.status || "OPEN",
    priority: data.priority || "MEDIUM",
    assigned_admin: data.assigned_admin || "admin",
    created_at: now,
    updated_at: now,
    completed_at: data.status === "DONE" ? now : undefined,
  };

  // Always save in memory repo so in-memory tests/fallbacks work
  await inMemoryFollowupsRepo.create(newFollowup as any);

  if (isGoogleSheetsConfigured()) {
    try {
      const adapter = new GoogleSheetsAdapter();
      await adapter.appendRecord("FollowUps", newFollowup);
    } catch (err) {
      console.warn("Failed to append follow-up to Google Sheets:", err);
    }
  }

  return newFollowup;
}

/**
 * Updates a follow-up by ID
 */
export async function updateFollowup(
  id: string,
  patch: Partial<FollowUp>
): Promise<FollowUp> {
  let existing: FollowUp | null = null;
  let adapter: GoogleSheetsAdapter | null = null;

  if (isGoogleSheetsConfigured()) {
    try {
      adapter = new GoogleSheetsAdapter();
      const list = await adapter.readTab<FollowUp>("FollowUps", {
        skipCache: true,
      });
      existing = list.find((f) => f.followup_id === id) || null;
    } catch {
      existing = await inMemoryFollowupsRepo.getById(id);
    }
  } else {
    existing = await inMemoryFollowupsRepo.getById(id);
  }

  if (!existing) {
    throw new Error(`Follow-up with ID "${id}" not found.`);
  }

  const now = new Date().toISOString();
  const updatedPatch: Partial<FollowUp> = { ...patch, updated_at: now };

  if (patch.status === "DONE" || patch.status === "CANCELLED") {
    if (!patch.completed_at) {
      updatedPatch.completed_at = now;
    }
  } else if (patch.status === "OPEN") {
    updatedPatch.completed_at = "";
  }

  const updatedRecord: FollowUp = {
    ...existing,
    ...updatedPatch,
    followup_id: id,
  };

  // Update in memory repo
  try {
    await inMemoryFollowupsRepo.update(id, updatedPatch as any, existing.updated_at);
  } catch {
    // If concurrency check failed in memory or not found, update directly
    await inMemoryFollowupsRepo.create(updatedRecord as any);
  }

  if (adapter && isGoogleSheetsConfigured()) {
    try {
      await adapter.updateRecord<FollowUp>(
        "FollowUps",
        "followup_id",
        id,
        updatedPatch,
        existing.updated_at
      );
    } catch (err) {
      console.warn("Failed to update follow-up in Google Sheets:", err);
    }
  }

  return updatedRecord;
}
