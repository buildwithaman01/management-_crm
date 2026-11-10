import { describe, it, expect, beforeEach } from "vitest";
import { getClientConfig } from "@/config/client-config";
import { generateId, isValidId } from "@/lib/id-generator";
import {
  normalizePhone,
  isValidPhone,
  splitMulti,
  joinMulti,
  formatCurrency,
} from "@/lib/utils";
import { getStatusTone } from "@/components/ui/status-badge";
import { InMemoryRepo } from "@/lib/repository/in-memory-repo";
import { isValidAssignmentTransition } from "@/types/vocab";

describe("Phase 0 — Foundation & Design System Tests", () => {
  it("loads and validates client config correctly", () => {
    const config = getClientConfig();
    expect(config).toBeDefined();
    expect(config.id).toBe("swati");
    expect(typeof config.businessName).toBe("string");
    expect(config.businessName.length).toBeGreaterThan(0);
    expect(config.colors.primary).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(config.features.smartMatching).toBe(true);
  });

  it("generates permanent, non-colliding IDs adhering to Section 7.4", () => {
    const studentId = generateId("STU");
    expect(isValidId(studentId, "STU")).toBe(true);

    const tutorId = generateId("TUT");
    expect(isValidId(tutorId, "TUT")).toBe(true);

    // Verify format: PREFIX-YYMM-XXXX
    expect(studentId).toMatch(/^STU-\d{4}-[A-HJ-NP-Z2-9]{4}$/);

    // Verify forbidden characters (0, O, 1, I) are never produced
    for (let i = 0; i < 50; i++) {
      const id = generateId("ASN");
      const xxxx = id.split("-")[2];
      expect(xxxx).not.toMatch(/[0O1I]/);
    }
  });

  it("normalizes and validates Indian phone numbers to E.164 format", () => {
    expect(normalizePhone("9876543210")).toBe("+919876543210");
    expect(normalizePhone("09876543210")).toBe("+919876543210");
    expect(normalizePhone("+91 98765-43210")).toBe("+919876543210");

    expect(isValidPhone("+919876543210")).toBe(true);
    expect(isValidPhone("9876543210")).toBe(true);
    expect(isValidPhone("12345")).toBe(false);
    expect(isValidPhone("+915123456789")).toBe(false); // starts with 5, Indian mobile must start with 6-9
  });

  it("handles multi-value fields with pipe separator", () => {
    const subjects = "Maths|Physics|Chemistry";
    expect(splitMulti(subjects)).toEqual(["Maths", "Physics", "Chemistry"]);
    expect(splitMulti("")).toEqual([]);
    expect(splitMulti(null)).toEqual([]);

    expect(joinMulti(["Maths", "Physics", "Chemistry"])).toBe(
      "Maths|Physics|Chemistry"
    );
    expect(joinMulti(["Maths", "", "   ", "Physics"])).toBe("Maths|Physics");
  });

  it("correctly maps status badge tones and labels", () => {
    expect(getStatusTone("VERIFIED")).toBe("green");
    expect(getStatusTone("ACTIVE")).toBe("green");
    expect(getStatusTone("PENDING")).toBe("amber");
    expect(getStatusTone("SHORTLISTED")).toBe("amber");
    expect(getStatusTone("CONTACTED")).toBe("blue");
    expect(getStatusTone("REJECTED")).toBe("red");
    expect(getStatusTone("BLACKLISTED")).toBe("red");
    expect(getStatusTone("INACTIVE")).toBe("gray");
  });

  it("enforces allowed assignment status transitions", () => {
    expect(isValidAssignmentTransition("SHORTLISTED", "CONTACTED")).toBe(true);
    expect(isValidAssignmentTransition("CONTACTED", "ACCEPTED")).toBe(true);
    expect(isValidAssignmentTransition("ACCEPTED", "DEMO_SCHEDULED")).toBe(true);
    expect(isValidAssignmentTransition("DEMO_SCHEDULED", "DEMO_COMPLETED")).toBe(true);
    expect(isValidAssignmentTransition("DEMO_COMPLETED", "ACTIVE")).toBe(true);
    expect(isValidAssignmentTransition("ACTIVE", "COMPLETED")).toBe(true);

    // Invalid jumps
    expect(isValidAssignmentTransition("SHORTLISTED", "ACTIVE")).toBe(false);
    expect(isValidAssignmentTransition("COMPLETED", "ACTIVE")).toBe(false);
  });

  describe("In-Memory Repository with Optimistic Concurrency", () => {
    interface TestItem {
      student_id: string;
      parent_name: string;
      created_at: string;
      updated_at: string;
      archived?: boolean;
    }

    let repo: InMemoryRepo<TestItem>;

    beforeEach(() => {
      repo = new InMemoryRepo<TestItem>("student_id");
    });

    it("creates, reads, updates and archives records with optimistic concurrency check", async () => {
      const created = await repo.create({
        student_id: "STU-2611-TEST",
        parent_name: "Aman Kumar",
      });

      expect(created.student_id).toBe("STU-2611-TEST");
      expect(created.parent_name).toBe("Aman Kumar");
      expect(created.created_at).toBeDefined();

      const read = await repo.getById("STU-2611-TEST");
      expect(read).toEqual(created);

      // Short delay to guarantee updated_at timestamp advances
      await new Promise((resolve) => setTimeout(resolve, 15));

      // Successful update with matching expectedUpdatedAt
      const updated = await repo.update(
        "STU-2611-TEST",
        { parent_name: "Aman Sharma" },
        created.updated_at
      );
      expect(updated.parent_name).toBe("Aman Sharma");
      expect(updated.updated_at).not.toBe(created.updated_at);

      // Rejected update when expectedUpdatedAt is stale
      await expect(
        repo.update(
          "STU-2611-TEST",
          { parent_name: "Collision Test" },
          created.updated_at // old timestamp
        )
      ).rejects.toThrow(
        "This record was changed by someone else. Reload and try again."
      );

      // Archive hides from normal list
      await repo.archive("STU-2611-TEST");
      const activeList = await repo.list();
      expect(activeList.length).toBe(0);

      const allList = await repo.list({ includeArchived: true });
      expect(allList.length).toBe(1);
      expect(allList[0].archived).toBe(true);
    });
  });
});
