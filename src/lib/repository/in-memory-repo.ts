import { Repo } from "./repo.interface";

export class InMemoryRepo<
  T extends {
    id?: string;
    student_id?: string;
    tutor_id?: string;
    assignment_id?: string;
    followup_id?: string;
    payment_id?: string;
    created_at: string;
    updated_at: string;
    archived?: boolean;
  }
> implements Repo<T> {
  protected items: Map<string, T> = new Map();
  private idKey: string;

  constructor(idKey: "student_id" | "tutor_id" | "assignment_id" | "followup_id" | "payment_id" | "id") {
    this.idKey = idKey;
  }

  private getItemId(item: T): string {
    const val = (item as Record<string, unknown>)[this.idKey];
    return String(val || "");
  }

  async list(opts?: { includeArchived?: boolean }): Promise<T[]> {
    const all = Array.from(this.items.values());
    if (opts?.includeArchived) {
      return all;
    }
    return all.filter((item) => !item.archived);
  }

  async getById(id: string): Promise<T | null> {
    const item = this.items.get(id);
    return item ? { ...item } : null;
  }

  async create(data: Record<string, unknown>): Promise<T> {
    const now = new Date().toISOString();
    const id = (data[this.idKey] as string) || `ID-${Math.random().toString(36).substring(2, 9)}`;

    const newItem = {
      ...data,
      [this.idKey]: id,
      created_at: now,
      updated_at: now,
      archived: Boolean(data.archived) || false,
    } as unknown as T;

    this.items.set(id, newItem);
    return { ...newItem };
  }

  async update(id: string, patch: Partial<T>, expectedUpdatedAt: string): Promise<T> {
    const existing = this.items.get(id);
    if (!existing) {
      throw new Error(`Record with ID ${id} not found.`);
    }

    // Optimistic concurrency check (Section 6.1)
    if (existing.updated_at !== expectedUpdatedAt) {
      throw new Error(
        "This record was changed by someone else. Reload and try again."
      );
    }

    const now = new Date().toISOString();
    const updated = {
      ...existing,
      ...patch,
      [this.idKey]: id, // ID is immutable
      updated_at: now,
    };

    this.items.set(id, updated);
    return { ...updated };
  }

  async archive(id: string): Promise<void> {
    const existing = this.items.get(id);
    if (!existing) {
      throw new Error(`Record with ID ${id} not found.`);
    }

    const now = new Date().toISOString();
    existing.archived = true;
    existing.updated_at = now;
    this.items.set(id, existing);
  }

  // Helper for test cleanup
  clear(): void {
    this.items.clear();
  }
}
