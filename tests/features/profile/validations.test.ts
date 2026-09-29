import { describe, expect, it } from "vitest";
import { MAX_AVATAR_SIZE_BYTES } from "@/lib/validation-patterns";
import { parseProfileUpdateFormData } from "@/features/profile/validations";

function profileFormData(overrides: Record<string, string> = {}) {
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

describe("parseProfileUpdateFormData", () => {
  it("accepts valid profile fields", () => {
    const result = parseProfileUpdateFormData(profileFormData());

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.firstName).toBe("Sujaree");
      expect(result.data.lastName).toBe("Techin");
      expect(result.data.phone).toBe("0812345678");
      expect(result.data.country).toBe("Thailand");
      expect(result.photo).toBeNull();
      expect(result.removeAvatar).toBe(false);
    }
  });

  it("accepts a valid profile picture upload", () => {
    const form = profileFormData();
    form.set(
      "profilePicture",
      new File([new Uint8Array([1, 2, 3])], "avatar.jpg", { type: "image/jpeg" }),
    );

    const result = parseProfileUpdateFormData(form);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.photo).not.toBeNull();
      expect(result.removeAvatar).toBe(false);
    }
  });

  it("marks removeAvatar when requested without a new photo", () => {
    const form = profileFormData();
    form.set("removeAvatar", "true");

    const result = parseProfileUpdateFormData(form);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.photo).toBeNull();
      expect(result.removeAvatar).toBe(true);
    }
  });

  it("rejects a first name that is too short", () => {
    const result = parseProfileUpdateFormData(profileFormData({ firstName: "A" }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors.firstName).toBe("First name must be at least 2 characters");
    }
  });

  it("rejects a first name with digits", () => {
    const result = parseProfileUpdateFormData(profileFormData({ firstName: "Test123" }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors.firstName).toBe("First name can only contain letters");
    }
  });

  it("rejects an invalid phone number", () => {
    const result = parseProfileUpdateFormData(profileFormData({ phone: "12345" }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors.phone).toBe(
        "Enter a valid phone number (9-10 digits, starting with 0)",
      );
    }
  });

  it("rejects a customer who is under 18", () => {
    const result = parseProfileUpdateFormData(profileFormData({ dateOfBirth: "2015-01-01" }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors.dateOfBirth).toBe("You must be at least 18 years old");
    }
  });

  it("rejects an invalid country", () => {
    const result = parseProfileUpdateFormData(profileFormData({ country: "Atlantis" }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors.country).toBe("Select a valid country");
    }
  });

  it("ignores an oversized profile picture", () => {
    const form = profileFormData();
    form.set(
      "profilePicture",
      new File([new Uint8Array(MAX_AVATAR_SIZE_BYTES + 1)], "avatar.jpg", {
        type: "image/jpeg",
      }),
    );

    const result = parseProfileUpdateFormData(form);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.photo).toBeNull();
    }
  });
});
