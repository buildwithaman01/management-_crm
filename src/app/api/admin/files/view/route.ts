import { NextRequest, NextResponse } from "next/server";
import { getSignedCdnUrl, getSignedFileUrl } from "@/lib/cloudinary/signed-urls";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type") || "document";
  const name = searchParams.get("name") || "Tutor Document";

  if (!id) {
    return new NextResponse(
      `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250">
        <rect width="400" height="250" fill="#f3f4f6" rx="12"/>
        <text x="200" y="130" font-family="sans-serif" font-size="14" fill="#9ca3af" text-anchor="middle">No Document Available</text>
      </svg>`,
      { headers: { "Content-Type": "image/svg+xml" } }
    );
  }

  // 1. Direct URL
  if (id.startsWith("http://") || id.startsWith("https://") || id.startsWith("data:image")) {
    return NextResponse.redirect(id);
  }

  // 2. Try signed Cloudinary URL for actual uploaded Cloudinary public IDs (which start with tutors/)
  if (id.startsWith("tutors/") && process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    try {
      const signedUrl = getSignedCdnUrl(id, 600);
      return NextResponse.redirect(signedUrl);
    } catch {
      // Fall through to placeholder SVG
    }
  }

  // 3. Fallback High-Fidelity SVG badge for mock/seeded IDs
  const isAadhaar = type.toLowerCase().includes("aadhaar") || id.includes("aadhaar");
  const headerBg = isAadhaar ? "#047857" : "#1F4E79";
  const titleText = isAadhaar ? "Aadhaar Card Record" : "Teacher Profile Photo";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="300" viewBox="0 0 480 300">
    <rect width="480" height="300" fill="#ffffff" rx="16" stroke="#e5e7eb" stroke-width="2"/>
    <rect width="480" height="50" fill="${headerBg}" rx="14 14 0 0"/>
    <text x="24" y="32" font-family="sans-serif" font-size="15" font-weight="bold" fill="#ffffff">${titleText}</text>
    <text x="456" y="32" font-family="sans-serif" font-size="11" fill="#e0e7ff" text-anchor="end">ID: ${id.length > 25 ? id.slice(0, 25) + "..." : id}</text>
    
    <g transform="translate(30, 80)">
      <rect width="70" height="70" fill="#f1f5f9" rx="8" stroke="#cbd5e1" stroke-width="1"/>
      <circle cx="35" cy="28" r="14" fill="#94a3b8"/>
      <path d="M 15 60 C 15 45, 55 45, 55 60" fill="#94a3b8"/>
      
      <text x="85" y="24" font-family="sans-serif" font-size="14" font-weight="bold" fill="#1e293b">${name}</text>
      <text x="85" y="44" font-family="sans-serif" font-size="11" fill="#64748b">Verified Identity Credential</text>
      <text x="85" y="64" font-family="monospace" font-size="12" fill="#0369a1" font-weight="bold">${id}</text>
    </g>

    <line x1="30" y1="180" x2="450" y2="180" stroke="#f1f5f9" stroke-width="2"/>
    <rect x="30" y="200" width="420" height="40" fill="#f8fafc" rx="8"/>
    <text x="45" y="225" font-family="sans-serif" font-size="11" fill="#475569">Document on file in bureau database. Upload a replacement image to view full photo.</text>
    <text x="240" y="280" font-family="sans-serif" font-size="10" fill="#94a3b8" text-anchor="middle">Swati Home Tuition Bureau • Identity Verification Engine</text>
  </svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=60",
    },
  });
}
