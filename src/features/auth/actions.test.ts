// Integration tests for the login server action — these call the REAL
// Supabase Auth API using real accounts (see .env.local's TEST_USER_*/
// TEST_STAFF_* vars), not mocks of Supabase itself. They need network
// access and a valid .env.local to pass; run via `npm test`, which loads
// .env.local through dotenv-cli first.
//
// `login()` is a Next.js Server Action: it calls `redirect()` (next/
// navigation) and, via createClient(), `cookies()` (next/headers) — both
// require an active Next.js request context that doesn't exist under plain
// Vitest. They're mocked here with minimal, framework-accurate stand-ins
// (redirect throws the same NEXT_REDIRECT-shaped error Next.js itself
// throws; cookies() is a plain in-memory jar) so the action's actual
// business logic — validation, Supabase calls, role-based redirect target —
// still runs for real.
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const cookieStore = vi.hoisted(() => new Map<string, string>());

vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => [...cookieStore.entries()].map(([name, value]) => ({ name, value })),
    get: (name: string) => (cookieStore.has(name) ? { name, value: cookieStore.get(name)! } : undefined),
    set: (name: string, value: string) => {
      cookieStore.set(name, value);
    },
  }),
  headers: async () => new Headers(),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    const error = new Error("NEXT_REDIRECT");
    (error as Error & { digest: string }).digest = `NEXT_REDIRECT;replace;${url};307;`;
    throw error;
  },
}));

const { login } = await import("./actions");

function loginFormData(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
}

// login() redirects on success (throwing, like the real Next.js function)
// and returns an error object otherwise. This runs it and reports which
// happened, so a single helper covers both "did it redirect" and "where".
async function attemptLogin(fields: Record<string, string>) {
  try {
    const result = await login(undefined, loginFormData(fields));
    return { redirectedTo: null, result };
  } catch (error) {
    const digest = (error as Error & { digest?: string }).digest;
    if (digest?.startsWith("NEXT_REDIRECT")) {
      return { redirectedTo: digest.split(";")[2], result: null };
    }
    throw error;
  }
}

const USER = {
  email: process.env.TEST_USER_EMAIL,
  password: process.env.TEST_USER_PASSWORD,
  username: process.env.TEST_USER_USERNAME,
};
const STAFF = { email: process.env.TEST_STAFF_EMAIL, password: process.env.TEST_STAFF_PASSWORD };

const REQUIRED_ENV_VARS = [
  "TEST_USER_EMAIL",
  "TEST_USER_PASSWORD",
  "TEST_USER_USERNAME",
  "TEST_STAFF_EMAIL",
  "TEST_STAFF_PASSWORD",
] as const;

beforeAll(() => {
  // Checked by env var name directly — USER and STAFF share key names
  // (email, password), so merging the two objects for this check would
  // silently let one side's value mask a missing var on the other.
  for (const name of REQUIRED_ENV_VARS) {
    if (!process.env[name]) {
      throw new Error(`Missing ${name} — set it in .env.local`);
    }
  }
});

afterEach(() => {
  // Each test starts signed out — otherwise a successful login earlier in
  // the file would leave its session cookie sitting in the shared jar for
  // the next test to (incorrectly) inherit.
  cookieStore.clear();
});

describe("login", () => {
  it("Happy Path: correct email + password for a regular customer redirects to /", async () => {
    const { redirectedTo } = await attemptLogin({ email: USER.email!, password: USER.password! });
    expect(redirectedTo).toBe("/");
  });

  it("Happy Path: correct email + password for a staff account redirects to /room-management", async () => {
    const { redirectedTo } = await attemptLogin({ email: STAFF.email!, password: STAFF.password! });
    expect(redirectedTo).toBe("/room-management");
  });

  it("Happy Path: correct username + password resolves to the account's email and logs in", async () => {
    const { redirectedTo } = await attemptLogin({ email: USER.username!, password: USER.password! });
    expect(redirectedTo).toBe("/");
  });

  it("Happy Path: an internal redirectTo overrides the role-based default", async () => {
    const { redirectedTo } = await attemptLogin({
      email: USER.email!,
      password: USER.password!,
      redirectTo: "/customer-booking/123",
    });
    expect(redirectedTo).toBe("/customer-booking/123");
  });

  it("Error Case: empty email shows a field error and never calls Supabase", async () => {
    const { result } = await attemptLogin({ email: "", password: USER.password! });
    expect(result).toEqual({ fieldErrors: { email: ["Username or email is required"] } });
  });

  it("Error Case: empty password shows a field error", async () => {
    const { result } = await attemptLogin({ email: USER.email!, password: "" });
    expect(result).toEqual({ fieldErrors: { password: ["Password is required"] } });
  });

  it("Error Case: a whitespace-only email is treated as empty", async () => {
    const { result } = await attemptLogin({ email: "   ", password: USER.password! });
    expect(result).toEqual({ fieldErrors: { email: ["Username or email is required"] } });
  });

  it("Error Case: correct email with the wrong password gives the generic invalid-credentials message", async () => {
    const { result } = await attemptLogin({ email: USER.email!, password: "definitely-wrong-password" });
    expect(result).toEqual({ message: "Invalid email or password" });
  });

  it("Error Case: an email with no account gives the same generic message (no account-existence leak)", async () => {
    const { result } = await attemptLogin({ email: "no-such-account-xyz@example.com", password: "whatever123" });
    expect(result).toEqual({ message: "Invalid email or password" });
  });

  it("Error Case: a username with no matching profile gives the same generic message", async () => {
    const { result } = await attemptLogin({ email: "ghost-user-does-not-exist", password: "whatever123" });
    expect(result).toEqual({ message: "Invalid email or password" });
  });

  it("Error Case: an external redirectTo is ignored, falling back to the role-based default", async () => {
    const { redirectedTo } = await attemptLogin({
      email: USER.email!,
      password: USER.password!,
      redirectTo: "//evil.com",
    });
    expect(redirectedTo).toBe("/");
  });
});
