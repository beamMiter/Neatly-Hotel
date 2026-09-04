// Integration tests for POST /api/register — this is a plain Route Handler
// (not a Server Action), so unlike login() it needs no next/headers or
// next/navigation mocking; only `server-only` (imported by supabase-admin.ts)
// needs a stand-in under plain Vitest.
//
// These call the REAL Supabase Admin API. Validation-error cases never reach
// Supabase (they fail before any DB call). Duplicate-detection cases reuse
// the already-existing TEST_USER_EMAIL/TEST_USER_USERNAME account (see
// .env.local) so they write nothing new. Only the Happy Path case creates a
// real account, and it deletes what it created in `finally` so re-running
// this file never leaves residue in the shared team project.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { POST } = await import("./route");
const { supabaseAdmin } = await import("@/server/db/supabase-admin");

const REQUIRED_ENV_VARS = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY", "TEST_USER_EMAIL", "TEST_USER_USERNAME"] as const;

beforeAll(() => {
  for (const name of REQUIRED_ENV_VARS) {
    if (!process.env[name]) {
      throw new Error(`Missing ${name} — set it in .env.local`);
    }
  }
});

function dateYearsAgo(years: number) {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return date.toISOString().slice(0, 10);
}

function uniqueSuffix() {
  return `${Date.now()}${Math.floor(Math.random() * 10_000)}`;
}

// Kept separate from the email suffix: username has a 20-char schema limit,
// too tight for Date.now()'s 13 digits plus a "vitestreg" prefix.
function uniqueUsername() {
  return `vitestreg${Date.now().toString(36)}`;
}

function validFields() {
  const suffix = uniqueSuffix();
  return {
    firstName: "Somchai",
    lastName: "Deenan",
    username: uniqueUsername(),
    email: `vitest.register.${suffix}@example.com`,
    password: "Passw0rd1",
    confirmPassword: "Passw0rd1",
    phone: "0812345678",
    dateOfBirth: dateYearsAgo(30),
    country: "Thailand",
  };
}

function registerFormData(fields: Record<string, string>, omit: string[] = []) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (!omit.includes(key)) formData.set(key, value);
  }
  return formData;
}

async function callRegister(formData: FormData) {
  const request = new Request("http://localhost/api/register", { method: "POST", body: formData });
  const response = await POST(request);
  return { status: response.status, body: await response.json() };
}

// Accounts created by the Happy Path tests below — deleted (profile row +
// auth user) once the whole file is done, regardless of which tests passed.
const createdUserIds: string[] = [];

afterAll(async () => {
  for (const id of createdUserIds) {
    await supabaseAdmin.from("profiles").delete().eq("id", id);
    await supabaseAdmin.auth.admin.deleteUser(id);
  }
});

describe("POST /api/register", () => {
  describe("Error Case: malformed request", () => {
    it("a non-multipart body is rejected before any validation runs", async () => {
      const request = new Request("http://localhost/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const response = await POST(request);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ message: "Invalid request body" });
    });
  });

  describe("Error Case: field validation (no Supabase call made)", () => {
    it("first name shorter than 2 characters", async () => {
      const { status, body } = await callRegister(registerFormData({ ...validFields(), firstName: "A" }));
      expect(status).toBe(400);
      expect(body.fieldErrors).toEqual({ firstName: "First name must be at least 2 characters" });
    });

    it("first name longer than 50 characters", async () => {
      const { status, body } = await callRegister(registerFormData({ ...validFields(), firstName: "A".repeat(51) }));
      expect(status).toBe(400);
      expect(body.fieldErrors).toEqual({ firstName: "First name is too long" });
    });

    it("first name containing digits", async () => {
      const { status, body } = await callRegister(registerFormData({ ...validFields(), firstName: "John1" }));
      expect(status).toBe(400);
      expect(body.fieldErrors).toEqual({ firstName: "First name can only contain letters" });
    });

    it("last name shorter than 2 characters", async () => {
      const { status, body } = await callRegister(registerFormData({ ...validFields(), lastName: "B" }));
      expect(status).toBe(400);
      expect(body.fieldErrors).toEqual({ lastName: "Last name must be at least 2 characters" });
    });

    it("username shorter than 3 characters", async () => {
      const { status, body } = await callRegister(registerFormData({ ...validFields(), username: "ab" }));
      expect(status).toBe(400);
      expect(body.fieldErrors).toEqual({ username: "Username must be at least 3 characters" });
    });

    it("username longer than 20 characters", async () => {
      const { status, body } = await callRegister(registerFormData({ ...validFields(), username: "a".repeat(21) }));
      expect(status).toBe(400);
      expect(body.fieldErrors).toEqual({ username: "Username must be at most 20 characters" });
    });

    it("username with characters other than letters, numbers, underscores", async () => {
      const { status, body } = await callRegister(registerFormData({ ...validFields(), username: "user name!" }));
      expect(status).toBe(400);
      expect(body.fieldErrors).toEqual({ username: "Username can only contain letters, numbers, and underscores" });
    });

    it("empty email", async () => {
      const { status, body } = await callRegister(registerFormData({ ...validFields(), email: "" }));
      expect(status).toBe(400);
      expect(body.fieldErrors).toEqual({ email: "Email is required" });
    });

    it("malformed email", async () => {
      const { status, body } = await callRegister(registerFormData({ ...validFields(), email: "not-an-email" }));
      expect(status).toBe(400);
      expect(body.fieldErrors).toEqual({ email: "Enter a valid email address" });
    });

    it("password shorter than 8 characters", async () => {
      const { status, body } = await callRegister(
        registerFormData({ ...validFields(), password: "abc12", confirmPassword: "abc12" }),
      );
      expect(status).toBe(400);
      expect(body.fieldErrors).toEqual({ password: "Password must be at least 8 characters" });
    });

    it("password with no letters", async () => {
      const { status, body } = await callRegister(
        registerFormData({ ...validFields(), password: "12345678", confirmPassword: "12345678" }),
      );
      expect(status).toBe(400);
      expect(body.fieldErrors).toEqual({ password: "Password must contain at least one letter" });
    });

    it("password with no numbers", async () => {
      const { status, body } = await callRegister(
        registerFormData({ ...validFields(), password: "abcdefgh", confirmPassword: "abcdefgh" }),
      );
      expect(status).toBe(400);
      expect(body.fieldErrors).toEqual({ password: "Password must contain at least one number" });
    });

    it("confirmPassword left empty", async () => {
      const { status, body } = await callRegister(registerFormData({ ...validFields(), confirmPassword: "" }));
      expect(status).toBe(400);
      expect(body.fieldErrors).toEqual({ confirmPassword: "Please confirm your password" });
    });

    it("confirmPassword not matching password (server-side re-check, not just RegisterForm's client-side one)", async () => {
      const { status, body } = await callRegister(
        registerFormData({ ...validFields(), password: "Passw0rd1", confirmPassword: "Different1" }),
      );
      expect(status).toBe(400);
      expect(body.fieldErrors).toEqual({ confirmPassword: "Passwords do not match" });
    });

    it("invalid phone number", async () => {
      const { status, body } = await callRegister(registerFormData({ ...validFields(), phone: "12345" }));
      expect(status).toBe(400);
      expect(body.fieldErrors).toEqual({ phone: "Enter a valid phone number (9-10 digits, starting with 0)" });
    });

    it("missing date of birth", async () => {
      const { status, body } = await callRegister(registerFormData(validFields(), ["dateOfBirth"]));
      expect(status).toBe(400);
      expect(body.fieldErrors).toEqual({ dateOfBirth: "Date of birth is required" });
    });

    it("date of birth in the future", async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const { status, body } = await callRegister(registerFormData({ ...validFields(), dateOfBirth: tomorrow }));
      expect(status).toBe(400);
      expect(body.fieldErrors).toEqual({ dateOfBirth: "Date of birth cannot be in the future" });
    });

    it("date of birth under the 18-year-old minimum", async () => {
      const { status, body } = await callRegister(
        registerFormData({ ...validFields(), dateOfBirth: dateYearsAgo(10) }),
      );
      expect(status).toBe(400);
      expect(body.fieldErrors).toEqual({ dateOfBirth: "You must be at least 18 years old to register" });
    });

    it("date of birth older than the 120-year sanity limit", async () => {
      const { status, body } = await callRegister(
        registerFormData({ ...validFields(), dateOfBirth: dateYearsAgo(150) }),
      );
      expect(status).toBe(400);
      expect(body.fieldErrors).toEqual({ dateOfBirth: "Please enter a valid date of birth" });
    });

    it("country not in the supported list", async () => {
      const { status, body } = await callRegister(registerFormData({ ...validFields(), country: "Narnia" }));
      expect(status).toBe(400);
      expect(body.fieldErrors).toEqual({ country: "Select a valid country" });
    });
  });

  describe("Error Case: duplicate detection (reuses the existing test account, writes nothing new)", () => {
    it("username already taken", async () => {
      const fields = validFields();
      fields.username = process.env.TEST_USER_USERNAME!;
      const { status, body } = await callRegister(registerFormData(fields));
      expect(status).toBe(409);
      expect(body).toEqual({
        message: "Username already taken",
        fieldErrors: { username: "This username is already taken" },
      });
    });

    it("email already registered", async () => {
      const fields = validFields();
      fields.email = process.env.TEST_USER_EMAIL!;
      const { status, body } = await callRegister(registerFormData(fields));
      expect(status).toBe(409);
      expect(body).toEqual({
        message: "Email already registered",
        fieldErrors: { email: "This email is already registered" },
      });
    });
  });

  describe("Happy Path (creates a real account, deleted in afterAll)", () => {
    it("registers a new account and persists the profile row", async () => {
      const fields = validFields();
      const { status, body } = await callRegister(registerFormData(fields));

      try {
        expect(status).toBe(201);
        expect(body).toMatchObject({
          message: "Registration successful",
          user: { firstName: fields.firstName, lastName: fields.lastName, email: fields.email },
        });
        expect(body.user.id).toEqual(expect.any(String));

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("username, phone, country")
          .eq("id", body.user.id)
          .single();
        expect(profile).toMatchObject({ username: fields.username, phone: fields.phone, country: fields.country });
      } finally {
        if (body?.user?.id) createdUserIds.push(body.user.id);
      }
    });
  });
});
