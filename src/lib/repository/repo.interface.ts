/**
 * Minimal repository interface adhering to Section 4 of the spec.
 * All domain repositories follow this shape.
 * This guarantees complete separation from Google Sheets and allows in-memory mock testing.
 */

export interface Repo<T extends { id?: string; student_id?: string; tutor_id?: string; assignment_id?: string; followup_id?: string; payment_id?: string; created_at: string; updated_at: string; archived?: boolean }> {
  list(opts?: { includeArchived?: boolean }): Promise<T[]>;
  getById(id: string): Promise<T | null>;
  create(data: Record<string, unknown>): Promise<T>;
  update(id: string, patch: Partial<T>, expectedUpdatedAt: string): Promise<T>;
  archive(id: string): Promise<void>;
}
