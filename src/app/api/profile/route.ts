import { NextResponse } from "next/server";
import { parseProfileUpdateFormData } from "@/features/profile/validations";
import { createClient } from "@/server/db/supabase-server";
import { supabaseAdmin } from "@/server/db/supabase-admin";
import { updateOwnProfile } from "@/server/queries/profiles.query";
import { toLocalIsoDate } from "@/lib/local-date";

// Signature verification for who's calling is the auth.getUser() below —
// everything after it is scoped to exactly that user's own id, never a
// client-supplied one.
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Not signed in" }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const parsed = parseProfileUpdateFormData(formData);
  if (!parsed.success) {
    return NextResponse.json({ message: "Validation failed", fieldErrors: parsed.fieldErrors }, { status: 400 });
  }

  const { data, photo, removeAvatar } = parsed;
  let avatarUrl: string | null | undefined;

  // Storage upload uses supabaseAdmin, not the RLS-bound client: the
  // `avatars` bucket only has a public SELECT policy (see
  // supabase/migrations/0001_profiles.sql) — no INSERT/UPDATE policy exists
  // for authenticated users, matching /api/register's own avatar upload.
  // Safe here specifically because the path is hard-coded to `user.id`
  // (never client input) and only reached after the auth check above.
  if (photo) {
    const extension = photo.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/avatar.${extension}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("avatars")
      .upload(path, photo, { contentType: photo.type, upsert: true });

    if (uploadError) {
      console.error("[profile] avatar upload failed:", uploadError);
      return NextResponse.json({ message: "Failed to upload photo. Please try again." }, { status: 500 });
    }
    avatarUrl = supabaseAdmin.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  } else if (removeAvatar) {
    avatarUrl = null;
  }

  const result = await updateOwnProfile(user.id, {
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone,
    dateOfBirth: toLocalIsoDate(data.dateOfBirth),
    country: data.country,
    ...(avatarUrl !== undefined ? { avatarUrl } : {}),
  });

  if (!result.ok) {
    if (result.code === "NOT_FOUND") {
      return NextResponse.json(
        { message: "No profile found for this account — staff/admin accounts don't have a customer profile to edit." },
        { status: 404 },
      );
    }
    return NextResponse.json({ message: "Failed to update profile. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ message: "Profile updated" });
}
