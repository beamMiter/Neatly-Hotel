import { NextResponse } from "next/server";
import { parseRegisterFormData, getPasswordMismatchError } from "@/features/auth/validations";
import { supabaseAdmin } from "@/server/db/supabase-admin";

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const parsed = parseRegisterFormData(formData);
  if (!parsed.success) {
    return NextResponse.json({ message: "Validation failed", fieldErrors: parsed.fieldErrors }, { status: 400 });
  }

  const { data, photo } = parsed;

  // RegisterForm checks this client-side before ever submitting, but that's
  // UX only — a direct POST to this route bypassing the form would
  // otherwise silently register the account with just `password`, ignoring
  // a mismatched confirmPassword entirely. Same check resetPassword already
  // does server-side for the same reason.
  const mismatchError = getPasswordMismatchError(data.password, data.confirmPassword);
  if (mismatchError) {
    return NextResponse.json(
      { message: "Validation failed", fieldErrors: { confirmPassword: mismatchError } },
      { status: 400 },
    );
  }

  const { data: existingUsername } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("username", data.username)
    .maybeSingle();

  if (existingUsername) {
    return NextResponse.json(
      { message: "Username already taken", fieldErrors: { username: "This username is already taken" } },
      { status: 409 }
    );
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: { first_name: data.firstName, last_name: data.lastName },
  });

  if (authError) {
    const isDuplicateEmail = authError.code === "email_exists" || authError.status === 422;
    if (isDuplicateEmail) {
      return NextResponse.json(
        { message: "Email already registered", fieldErrors: { email: "This email is already registered" } },
        { status: 409 }
      );
    }
    console.error("[register] auth.admin.createUser failed:", authError);
    return NextResponse.json({ message: "Registration failed. Please try again." }, { status: 500 });
  }

  const userId = authData.user.id;
  let avatarUrl: string | null = null;

  if (photo) {
    const extension = photo.name.split(".").pop() ?? "jpg";
    const path = `${userId}/avatar.${extension}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("avatars")
      .upload(path, photo, { contentType: photo.type, upsert: true });

    if (uploadError) {
      console.error("[register] avatar upload failed:", uploadError);
    } else {
      avatarUrl = supabaseAdmin.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    }
  }

  const { error: profileError } = await supabaseAdmin.from("profiles").insert({
    id: userId,
    first_name: data.firstName,
    last_name: data.lastName,
    username: data.username,
    phone: data.phone,
    date_of_birth: data.dateOfBirth.toISOString().slice(0, 10),
    country: data.country,
    avatar_url: avatarUrl,
  });

  if (profileError) {
    console.error("[register] profiles insert failed:", profileError);
    // Avoid leaving an orphaned auth user (with no profile) blocking a retry.
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return NextResponse.json({ message: "Registration failed. Please try again." }, { status: 500 });
  }

  return NextResponse.json(
    {
      message: "Registration successful",
      user: { id: userId, firstName: data.firstName, lastName: data.lastName, email: data.email },
    },
    { status: 201 }
  );
}
