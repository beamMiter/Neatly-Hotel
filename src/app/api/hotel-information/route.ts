import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { hasDatabaseUrl } from "@/server/db";
import {
  getHotelInformation,
  updateHotelInformation,
} from "@/server/queries/hotel.query";
import {
  authorizationErrorResponse,
  requireStaff,
} from "@/server/services/authorization";
import {
  DEFAULT_HOTEL_INFORMATION,
  type HotelInformation,
} from "@/types/hotel";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);
const TIME_PATTERN = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

function fallbackHotel(): HotelInformation {
  return { ...DEFAULT_HOTEL_INFORMATION };
}

export async function PUT(request: Request) {
  try {
    await requireStaff();
  } catch (error) {
    const response = authorizationErrorResponse(error);
    if (response) return response;
    throw error;
  }

  try {
    const form = await request.formData();
    const name = String(form.get("name") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    const removeLogo = String(form.get("removeLogo") ?? "") === "true";
    const logo = form.get("logo");
    const checkInTime = String(form.get("checkInTime") ?? "");
    const checkOutTime = String(form.get("checkOutTime") ?? "");

    if (!name || !description) {
      return NextResponse.json(
        { error: "Hotel name and description are required" },
        { status: 400 },
      );
    }

    if (!TIME_PATTERN.test(checkInTime) || !TIME_PATTERN.test(checkOutTime)) {
      return NextResponse.json(
        { error: "Check-in and check-out time must be a valid time" },
        { status: 400 },
      );
    }

    const current = hasDatabaseUrl()
      ? await getHotelInformation()
      : fallbackHotel();

    let logoUrl = current.logoUrl;

    if (removeLogo) {
      logoUrl = null;
    }

    if (logo instanceof File && logo.size > 0) {
      if (!ALLOWED_TYPES.has(logo.type)) {
        return NextResponse.json(
          { error: "Logo must be a PNG, JPEG, WebP, or SVG image" },
          { status: 400 },
        );
      }

      const extension = logo.name.split(".").pop()?.toLowerCase() || "png";
      const filename = `hotel-logo.${extension}`;
      await mkdir(UPLOAD_DIR, { recursive: true });
      const filepath = path.join(UPLOAD_DIR, filename);
      const buffer = Buffer.from(await logo.arrayBuffer());
      await writeFile(filepath, buffer);
      logoUrl = `/uploads/${filename}?t=${Date.now()}`;
    }

    if (!hasDatabaseUrl()) {
      return NextResponse.json({
        source: "mock",
        data: {
          ...current,
          name,
          description,
          logoUrl,
          checkInTime,
          checkOutTime,
        },
      });
    }

    const hotel = await updateHotelInformation({
      name,
      description,
      logoUrl,
      checkInTime,
      checkOutTime,
    });

    revalidatePath("/");

    return NextResponse.json({ source: "database", data: hotel });
  } catch (error) {
    console.error("[api/hotel-information] PUT failed:", error);
    return NextResponse.json(
      { error: "Failed to update hotel information" },
      { status: 500 },
    );
  }
}
