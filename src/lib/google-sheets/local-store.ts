import fs from "fs";
import path from "path";
import { TabName } from "./schema";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "local-db.json");

interface LocalDbSchema {
  Students: any[];
  Tutors: any[];
  Assignments: any[];
  FollowUps: any[];
  Followups?: any[];
  Payments: any[];
  ActivityLog: any[];
  Lookups?: any[];
  Settings: any[];
  MatchWeights: any[];
  TutorFields: any[];
  IdempotencyKeys: any[];
  Archive: any[];
  [key: string]: any;
}

const DEFAULT_DB: LocalDbSchema = {
  Students: [
    {
      student_id: "STU-2611-DEMO1",
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      parent_name: "Rajesh Kumar",
      student_name: "Aarav Kumar",
      phone: "+919835012345",
      whatsapp: "+919835012345",
      email: "rajesh.kumar@gmail.com",
      class: "CLASS_10",
      board: "CBSE",
      subjects: "MATHEMATICS|SCIENCE",
      tuition_type: "HOME",
      locality: "Kankarbagh",
      tutor_gender_preference: "ANY",
      preferred_timing: "EVENING",
      budget: 4500,
      classes_per_week: 3,
      academic_requirements: "Needs focused concept clearing in trigonometry and physics mechanics.",
      lead_status: "NEW",
      lead_source: "WEBSITE",
      admin_notes: "",
      consent_at: new Date().toISOString(),
      consent_version: "1.0",
      submission_key: "INIT_1",
      duplicate_of: "",
      archived: false,
    },
    {
      student_id: "STU-2611-DEMO2",
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date(Date.now() - 86400000).toISOString(),
      parent_name: "Pooja Verma",
      student_name: "Sneha Verma",
      phone: "+919876543210",
      whatsapp: "+919876543210",
      email: "pooja.verma@outlook.com",
      class: "CLASS_12",
      board: "CBSE",
      subjects: "PHYSICS|CHEMISTRY",
      tuition_type: "HOME",
      locality: "Boring Road",
      tutor_gender_preference: "FEMALE",
      preferred_timing: "EVENING",
      budget: 6000,
      classes_per_week: 4,
      academic_requirements: "Board exam preparation and numerical problem solving.",
      lead_status: "NEW",
      lead_source: "WEBSITE",
      admin_notes: "",
      consent_at: new Date().toISOString(),
      consent_version: "1.0",
      submission_key: "INIT_2",
      duplicate_of: "",
      archived: false,
    },
  ],
  Tutors: [
    {
      tutor_id: "TUT-2611-DEMO1",
      created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      full_name: "Vikram Malhotra",
      phone: "+919835112233",
      whatsapp: "+919835112233",
      email: "vikram.maths@gmail.com",
      gender: "MALE",
      current_city: "Patna",
      current_locality: "Kankarbagh",
      highest_qualification: "MASTERS",
      specialization: "Pure Mathematics",
      university: "Patna University",
      course: "M.Sc Mathematics",
      subjects: "MATHEMATICS|SCIENCE",
      secondary_subjects: "PHYSICS",
      classes: "CLASS_9|CLASS_10",
      boards: "CBSE|ICSE|BIHAR_BOARD",
      experience_years: 5,
      teaching_mode: "HOME",
      localities: "Kankarbagh|Rajendra Nagar|Hanuman Nagar",
      expected_fee: 5000,
      available_timings: "EVENING|MORNING",
      available_days: "MON|TUE|WED|THU|FRI|SAT",
      introduction: "Passionate mathematics teacher with 5+ years producing 95%+ board scorers.",
      photo_file_id: "demo_photo_vikram.jpg",
      id_type: "AADHAAR",
      id_number: "4455-6677-8899",
      id_proof_file_id: "demo_aadhaar_front_vikram.pdf",
      address_proof_file_id: "demo_aadhaar_back_vikram.pdf",
      background_check_status: "PASSED",
      verification_status: "VERIFIED",
      availability_status: "ACTIVE",
      verified_at: new Date().toISOString(),
      verified_by: "admin",
      lead_source: "WEBSITE",
      consent_at: new Date().toISOString(),
      consent_version: "1.0",
      submission_key: "INIT_TUT_1",
      archived: false,
    },
    {
      tutor_id: "TUT-2611-DEMO2",
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      full_name: "Ananya Roy",
      phone: "+919835998877",
      whatsapp: "+919835998877",
      email: "ananya.roy@gmail.com",
      gender: "FEMALE",
      current_city: "Patna",
      current_locality: "Boring Road",
      highest_qualification: "BACHELORS",
      specialization: "Physics Honours",
      university: "Magadh University",
      course: "B.Sc Physics",
      subjects: "PHYSICS|CHEMISTRY",
      secondary_subjects: "MATHEMATICS",
      classes: "CLASS_11|CLASS_12",
      boards: "CBSE|ICSE",
      experience_years: 4,
      teaching_mode: "BOTH",
      localities: "Boring Road|Bailey Road|Kidwaipuri",
      expected_fee: 6000,
      available_timings: "EVENING",
      available_days: "MON|WED|FRI|SAT",
      introduction: "Dedicated science educator specializing in numerical problem clarity.",
      photo_file_id: "demo_photo_ananya.jpg",
      id_type: "AADHAAR",
      id_number: "7788-9900-1122",
      id_proof_file_id: "demo_aadhaar_front_ananya.pdf",
      address_proof_file_id: "demo_aadhaar_back_ananya.pdf",
      background_check_status: "PASSED",
      verification_status: "VERIFIED",
      availability_status: "ACTIVE",
      verified_at: new Date().toISOString(),
      verified_by: "admin",
      lead_source: "WEBSITE",
      consent_at: new Date().toISOString(),
      consent_version: "1.0",
      submission_key: "INIT_TUT_2",
      archived: false,
    },
  ],
  Assignments: [],
  FollowUps: [],
  Followups: [],
  Payments: [],
  ActivityLog: [],
  Settings: [],
  MatchWeights: [],
  TutorFields: [],
  IdempotencyKeys: [],
  Archive: [],
};

class LocalFileStore {
  private ensureFile(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), "utf-8");
    }
  }

  private load(): LocalDbSchema {
    this.ensureFile();
    try {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(content) as LocalDbSchema;
    } catch {
      return { ...DEFAULT_DB };
    }
  }

  private save(data: LocalDbSchema): void {
    this.ensureFile();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  }

  async readTab<T>(
    tabName: TabName,
    opts?: { includeArchived?: boolean }
  ): Promise<T[]> {
    const data = this.load();
    const rows = (data[tabName] || []) as T[];
    if (opts?.includeArchived) {
      return [...rows];
    }
    return rows.filter((r: any) => !r.archived);
  }

  async appendRecord<T extends Record<string, any>>(
    tabName: TabName,
    record: T
  ): Promise<T> {
    const data = this.load();
    if (!data[tabName]) {
      data[tabName] = [];
    }
    data[tabName].push({ ...record });
    this.save(data);
    return record;
  }

  async updateRecord<T extends Record<string, any>>(
    tabName: TabName,
    idKey: string,
    idValue: string,
    patch: Partial<T>
  ): Promise<T> {
    const data = this.load();
    const list = data[tabName] || [];
    const index = list.findIndex(
      (item: any) => String(item[idKey]) === String(idValue)
    );

    if (index === -1) {
      throw new Error(`Record with ${idKey}=${idValue} not found in ${tabName}.`);
    }

    const updated = {
      ...list[index],
      ...patch,
      [idKey]: idValue,
      updated_at: new Date().toISOString(),
    };

    list[index] = updated;
    data[tabName] = list;
    this.save(data);
    return updated as T;
  }

  async deleteRecord(
    tabName: TabName,
    idKey: string,
    idValue: string
  ): Promise<boolean> {
    const data = this.load();
    const list = data[tabName] || [];
    const initialLen = list.length;
    data[tabName] = list.filter(
      (item: any) => String(item[idKey]) !== String(idValue)
    );
    const changed = data[tabName].length < initialLen;
    if (changed) {
      this.save(data);
    }
    return changed;
  }

  async archiveRecord(
    tabName: TabName,
    idKey: string,
    idValue: string
  ): Promise<void> {
    await this.updateRecord(tabName, idKey, idValue, {
      archived: true,
      updated_at: new Date().toISOString(),
    } as any);
  }
}

export const localStore = new LocalFileStore();
