import { describe, expect, it } from "vitest";
import {
  compressImage,
  MAX_UPLOAD_TOTAL_BYTES,
  totalFileSize,
} from "@/lib/compress-image";

function fileOfSize(bytes: number, name = "photo.png", type = "image/png") {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe("compressImage", () => {
  it("returns small images untouched", async () => {
    const small = fileOfSize(100 * 1024);
    await expect(compressImage(small)).resolves.toBe(small);
  });

  it("falls back to the original file when the image cannot be decoded", async () => {
    // Node has no createImageBitmap, and the bytes are not a real image either.
    const big = fileOfSize(2 * 1024 * 1024);
    await expect(compressImage(big)).resolves.toBe(big);
  });
});

describe("totalFileSize", () => {
  it("sums file sizes", () => {
    expect(totalFileSize([fileOfSize(10), fileOfSize(20)])).toBe(30);
    expect(totalFileSize([])).toBe(0);
  });

  it("keeps the upload cap below Vercel's 4.5MB body limit", () => {
    expect(MAX_UPLOAD_TOTAL_BYTES).toBeLessThan(4.5 * 1024 * 1024);
  });
});
