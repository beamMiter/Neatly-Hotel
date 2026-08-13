import { NextResponse } from "next/server";
import { registerSchema } from "@/src/lib/validations/register";

// In-memory stand-in so the "already registered" path is demonstrable.
// Swap this whole handler for a real backend call when the API is ready.
const MOCK_TAKEN_EMAILS = new Set(["taken@example.com", "demo@neatly.com"]);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse({
    ...body,
    dateOfBirth: typeof body.dateOfBirth === "string" && body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return NextResponse.json({ message: "Validation failed", fieldErrors }, { status: 400 });
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
