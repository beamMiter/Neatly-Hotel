import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/server/db/supabase-server";
import { getStaffRole } from "@/server/queries/staff-members.query";

export type StaffAuthContext = {
  userId: string;
};

export class AuthorizationError extends Error {
  readonly status: 401 | 403;

  constructor(status: 401 | 403, message: string) {
    super(message);
    this.status = status;
  }
}

export async function getStaffAuthContext(): Promise<StaffAuthContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const role = await getStaffRole(user.id);
  if (!role) return null;

  return { userId: user.id };
}

export async function requireStaff(): Promise<StaffAuthContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AuthorizationError(401, "Unauthorized");
  }

  const role = await getStaffRole(user.id);
  if (!role) {
    throw new AuthorizationError(403, "Forbidden");
  }

  return { userId: user.id };
}

export function authorizationErrorResponse(error: unknown): NextResponse | null {
  if (!(error instanceof AuthorizationError)) return null;
  return NextResponse.json({ message: error.message }, { status: error.status });
}
