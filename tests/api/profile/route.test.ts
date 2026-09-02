import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  updateOwnProfile: vi.fn(),
  upload: vi.fn(),
}));

vi.mock("@/server/db/supabase-server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mocks.getUser,
    },
  })),
}));

vi.mock("@/server/queries/profiles.query", () => ({
  updateOwnProfile: mocks.updateOwnProfile,
}));

vi.mock("@/server/db/supabase-admin", () => ({
  supabaseAdmin: {
    storage: {
      from: vi.fn(() => ({
        upload: mocks.upload,
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://example.com/avatar.jpg" } })),
      })),
    },
  },
}));

import { PATCH } from "@/app/api/profile/route";

const USER_ID = "11111111-1111-1111-1111-111111111111";

function profileRequest(form: FormData) {
  return new Request("http://localhost/api/profile", {
    method: "PATCH",
    body: form,
  });
}

function validProfileForm(overrides: Record<string, string> = {}) {
  const form = new FormData();
  const defaults = {
    firstName: "Sujaree",
    lastName: "Techin",
    phone: "0812345678",
    dateOfBirth: "2000-01-15",
    country: "Thailand",
  };

  for (const [key, value] of Object.entries({ ...defaults, ...overrides })) {
    form.set(key, value);
  }

  return form;
}

describe("PATCH /api/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: USER_ID, email: "guest@example.com" } } });
    mocks.updateOwnProfile.mockResolvedValue({ ok: true });
    mocks.upload.mockResolvedValue({ error: null });
  });

  it("returns 401 when the caller is not signed in", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });

    const response = await PATCH(profileRequest(validProfileForm()));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ message: "Not signed in" });
    expect(mocks.updateOwnProfile).not.toHaveBeenCalled();
  });

  it("updates a signed-in customer's profile", async () => {
    const response = await PATCH(profileRequest(validProfileForm({ firstName: "Namfon" })));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ message: "Profile updated" });
    expect(mocks.updateOwnProfile).toHaveBeenCalledWith(USER_ID, {
      firstName: "Namfon",
      lastName: "Techin",
      phone: "0812345678",
      dateOfBirth: "2000-01-15",
      country: "Thailand",
    });
  });

  it("returns validation errors for invalid profile fields", async () => {
    const response = await PATCH(profileRequest(validProfileForm({ phone: "12345" })));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      message: "Validation failed",
      fieldErrors: {
        phone: "Enter a valid phone number (9-10 digits, starting with 0)",
      },
    });
    expect(mocks.updateOwnProfile).not.toHaveBeenCalled();
  });

  it("returns 404 when the account has no editable customer profile", async () => {
    mocks.updateOwnProfile.mockResolvedValue({ ok: false, code: "NOT_FOUND" });

    const response = await PATCH(profileRequest(validProfileForm()));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      message:
        "No profile found for this account — staff/admin accounts don't have a customer profile to edit.",
    });
  });
});
