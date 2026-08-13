import { NextResponse } from "next/server";
import { parseRegisterPayload } from "@/features/auth/validations";

// In-memory stand-in so the "already registered" path is demonstrable.
// Swap this whole handler for a real backend call when the API is ready.
const MOCK_TAKEN_EMAILS = new Set(["taken@example.com", "demo@neatly.com"]);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = parseRegisterPayload(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "Validation failed", fieldErrors: parsed.fieldErrors }, { status: 400 });
  }

  await new Promise((resolve) => setTimeout(resolve, 600));

  if (MOCK_TAKEN_EMAILS.has(parsed.data.email.toLowerCase())) {
    return NextResponse.json(
      {
        message: "Email already registered",
        fieldErrors: { email: "This email is already registered" },
      },
      { status: 409 }
    );
  }

  return NextResponse.json(
    {
      message: "Registration successful",
      user: {
        id: crypto.randomUUID(),
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email,
      },
    },
    { status: 201 }
  );
}
