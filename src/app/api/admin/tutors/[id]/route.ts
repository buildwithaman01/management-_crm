import { NextRequest, NextResponse } from "next/server";
import { GoogleSheetsAdapter } from "@/lib/google-sheets/adapter";
import { Tutor } from "@/types/entities";
import { logActivity } from "@/lib/activity-log/activity-logger";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tutorId = params.id;
    const adapter = new GoogleSheetsAdapter();
    const tutors = await adapter.readTab<Tutor>("Tutors", {
      includeArchived: true,
    });

    const tutor = tutors.find((t) => t.tutor_id === tutorId);
    if (!tutor) {
      return NextResponse.json(
        { success: false, message: "Tutor not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, tutor });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch tutor" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tutorId = params.id;
    const body = await req.json();
    const adapter = new GoogleSheetsAdapter();

    const tutors = await adapter.readTab<Tutor>("Tutors", {
      includeArchived: true,
    });
    const existing = tutors.find((t) => t.tutor_id === tutorId);

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Tutor not found" },
        { status: 404 }
      );
    }

    // Allowed updatable fields
    const patchableFields: (keyof Tutor)[] = [
      "full_name",
      "phone",
      "whatsapp",
      "email",
      "gender",
      "current_city",
      "current_locality",
      "highest_qualification",
      "specialization",
      "university",
      "course",
      "subjects",
      "secondary_subjects",
      "classes",
      "boards",
      "experience_years",
      "teaching_mode",
      "localities",
      "expected_fee",
      "available_timings",
      "available_days",
      "introduction",
      "admin_notes",
      "availability_status",
      "verification_status",
      "photo_file_id",
      "id_type",
      "id_number",
      "id_proof_file_id",
      "address_proof_file_id",
      "resume_file_id",
    ];

    const patch: Partial<Tutor> = {};
    for (const field of patchableFields) {
      if (body[field] !== undefined) {
        (patch as any)[field] = body[field];
      }
    }

    // Automatically store uploaded document images to Cloudinary if configured
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_SECRET) {
      try {
        const { v2: cloudinary } = await import("cloudinary");
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
          secure: true,
        });

        const docFields: (keyof Tutor)[] = ["photo_file_id", "id_proof_file_id", "address_proof_file_id"];
        for (const df of docFields) {
          const val = patch[df];
          if (typeof val === "string" && val.startsWith("data:image")) {
            const uploadRes = await cloudinary.uploader.upload(val, {
              folder: `tutors/${tutorId}`,
              public_id: `${df}_${Date.now()}`,
              overwrite: true,
            });
            (patch as any)[df] = uploadRes.secure_url;
          }
        }
      } catch (cloudErr) {
        console.warn("Cloudinary direct upload fallback to data URI:", cloudErr);
      }
    }

    const updated = await adapter.updateRecord<Tutor>(
      "Tutors",
      "tutor_id",
      tutorId,
      patch,
      existing.updated_at
    );

    await logActivity({
      adminId: "admin",
      entityType: "TUTOR",
      entityId: tutorId,
      action: "UPDATE_DETAILS",
      description: `Updated tutor profile for ${updated.full_name}`,
      changes: JSON.stringify(patch),
      sheetsAdapter: adapter,
    });

    return NextResponse.json({
      success: true,
      message: "Tutor record updated successfully",
      tutor: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update tutor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tutorId = params.id;
    const adapter = new GoogleSheetsAdapter();

    const tutors = await adapter.readTab<Tutor>("Tutors", {
      includeArchived: true,
    });
    const existing = tutors.find((t) => t.tutor_id === tutorId);

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Tutor not found" },
        { status: 404 }
      );
    }

    await adapter.deleteRecord("Tutors", "tutor_id", tutorId);

    await logActivity({
      adminId: "admin",
      entityType: "TUTOR",
      entityId: tutorId,
      action: "DELETE_TUTOR",
      description: `Deleted tutor record ${existing.full_name} (${tutorId})`,
      sheetsAdapter: adapter,
    });

    return NextResponse.json({
      success: true,
      message: "Tutor deleted successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete tutor" },
      { status: 500 }
    );
  }
}
