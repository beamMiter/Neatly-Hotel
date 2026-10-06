import type { IncomingMessage } from "node:http";
import { Readable } from "node:stream";
import { getCloneableBody } from "next/dist/server/body-streams";
import { describe, expect, it } from "vitest";
import nextConfig from "../../../next.config";
import { parseCreateRoomFormData, parseUpdateRoomFormData } from "@/features/rooms/validations";
import { BED_TYPES } from "@/types/room-type";

const MB = 1024 * 1024;

function roomForm(fileCount: number, bytesPerFile: number) {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    roomType: "Upload regression room", roomSizeSqm: "40", bedType: BED_TYPES[0],
    guests: "2", price: "1500", description: "A test room", amenities: "Wi-Fi",
  })) form.append(key, value);
  for (let i = 0; i < fileCount; i++) {
    form.append(i === 0 ? "mainImage" : "gallery", new File(
      [new Uint8Array(bytesPerFile)], `room-${i}.jpg`, { type: "image/jpeg" },
    ));
  }
  return form;
}

describe("room image multipart uploads", () => {
  it("preserves five 5MB images through the configured Next.js proxy buffer", async () => {
    const form = roomForm(5, 5 * MB);
    expect(parseCreateRoomFormData(form).success).toBe(true);
    const request = new Request("http://localhost/api/room-types", { method: "POST", body: form });
    const body = Buffer.from(await request.arrayBuffer());
    const chunks: Buffer[] = [];
    for (let offset = 0; offset < body.length; offset += 64 * 1024) {
      chunks.push(body.subarray(offset, offset + 64 * 1024));
    }
    // Use the installed framework's real buffering code, without network or DB writes.
    const incoming = Readable.from(chunks) as unknown as IncomingMessage;
    const limit = nextConfig.experimental?.proxyClientMaxBodySize;
    expect(typeof limit).toBe("number");
    const cloned = getCloneableBody(incoming, limit as number).cloneBodyStream();
    const received: Buffer[] = [];
    for await (const chunk of cloned) received.push(Buffer.from(chunk));
    const forwarded = Buffer.concat(received);
    expect(forwarded.byteLength).toBe(body.byteLength);
    const parsed = await new Request(request.url, {
      method: "POST", headers: request.headers, body: forwarded,
    }).formData();
    expect(parseCreateRoomFormData(parsed).success).toBe(true);
    expect(parsed.getAll("gallery")).toHaveLength(4);
  });

  it("accepts files at the 30MB total boundary", () => {
    expect(parseCreateRoomFormData(roomForm(6, 5 * MB)).success).toBe(true);
  });

  it("rejects oversized create forms before sending them", () => {
    expect(parseCreateRoomFormData(roomForm(7, 5 * MB))).toMatchObject({
      success: false, fieldErrors: { gallery: expect.stringContaining("30MB") },
    });
  });

  it("applies the same file budget to replacement images when editing", () => {
    const create = roomForm(7, 5 * MB);
    const edit = new FormData();
    for (const [key, value] of create) edit.append(key === "gallery" ? "galleryNewFile" : key, value);
    edit.append("galleryOrder", JSON.stringify(Array.from({ length: 6 }, (_, i) => `new:${i}`)));
    expect(parseUpdateRoomFormData(edit)).toMatchObject({
      success: false, fieldErrors: { gallery: expect.stringContaining("30MB") },
    });
  });
});
