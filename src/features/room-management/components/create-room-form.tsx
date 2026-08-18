"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { RoomStatusBadge } from "@/features/room-management/components/room-status-badge";
import {
  createPhysicalRoomSchema,
  type CreatePhysicalRoomFieldErrors,
} from "@/features/room-management/validations";
import type { RoomTypeOption } from "@/types/rooms";
import { BED_TYPES, ROOM_STATUSES, type BedType, type RoomStatus } from "@/types/rooms";

type CreateRoomFormProps = {
  roomTypes: RoomTypeOption[];
};

export function CreateRoomForm({ roomTypes }: CreateRoomFormProps) {
  const router = useRouter();
  const [roomTypeId, setRoomTypeId] = useState("");
  const [roomType, setRoomType] = useState("");
  const [bedType, setBedType] = useState<BedType | "">("");
  const [status, setStatus] = useState<RoomStatus>("Vacant");
  const [errors, setErrors] = useState<CreatePhysicalRoomFieldErrors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedRoomType = useMemo(
    () => roomTypes.find((option) => option.id === roomTypeId || option.name === roomType),
    [roomTypeId, roomType, roomTypes],
  );

  function handleRoomTypeChange(value: string) {
    const option = roomTypes.find((item) => item.id === value || item.name === value);
    setRoomTypeId(option?.id ?? "");
    setRoomType(option?.name ?? value);

    if (option?.bedType && BED_TYPES.includes(option.bedType as BedType)) {
      setBedType(option.bedType as BedType);
    }

    setErrors((current) => ({
      ...current,
      roomType: undefined,
      bedType: undefined,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const parsed = createPhysicalRoomSchema.safeParse({
      roomType,
      roomTypeId: roomTypeId || null,
      bedType,
      status,
    });

    if (!parsed.success) {
      const fieldErrors: CreatePhysicalRoomFieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string" && !fieldErrors[field as keyof CreatePhysicalRoomFieldErrors]) {
          fieldErrors[field as keyof CreatePhysicalRoomFieldErrors] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setSaving(true);

    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Failed to create room");
      }

      router.push("/room-management");
      router.refresh();
    } catch (error) {
      console.error("[room-management] Create room failed:", error);
      setFormError(
        error instanceof Error ? error.message : "Could not create room. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex h-full min-h-0 w-full flex-1 flex-col bg-[#F7F8FA]"
    >
      <header className="flex h-[72px] w-full shrink-0 items-center justify-between bg-white px-10">
        <h1 className="text-[20px] font-medium text-[#222222]">Create Room</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/room-management"
            className="flex h-10 items-center rounded-[4px] border border-[#D0D5DD] px-4 text-[14px] font-medium text-[#344054]"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex h-10 items-center rounded-[4px] bg-[#C34A2C] px-5 text-[14px] font-medium text-white disabled:opacity-60"
          >
            {saving ? "Creating..." : "Create Room"}
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-10 py-6">
        <div className="rounded-[4px] bg-white px-10 py-8">
          <div className="flex max-w-[560px] flex-col gap-6">
            <Field id="room-type" label="Room type" required error={errors.roomType}>
              <select
                id="room-type"
                value={roomTypeId || roomType}
                onChange={(event) => handleRoomTypeChange(event.target.value)}
                className={fieldClassName(Boolean(errors.roomType))}
              >
                <option value="" disabled>
                  Select room type
                </option>
                {roomTypes.map((option) => (
                  <option key={option.id ?? option.name} value={option.id ?? option.name}>
                    {option.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field id="bed-type" label="Bed Type" required error={errors.bedType}>
              <select
                id="bed-type"
                value={bedType}
                onChange={(event) => {
                  setBedType(event.target.value as BedType);
                  setErrors((current) => ({ ...current, bedType: undefined }));
                }}
                className={fieldClassName(Boolean(errors.bedType))}
              >
                <option value="" disabled>
                  Select bed type
                </option>
                {BED_TYPES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>

            <Field id="status" label="Status" required error={errors.status}>
              <select
                id="status"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as RoomStatus);
                  setErrors((current) => ({ ...current, status: undefined }));
                }}
                className={fieldClassName(Boolean(errors.status))}
              >
                {ROOM_STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <div className="mt-2">
                <RoomStatusBadge status={status} />
              </div>
            </Field>

            {selectedRoomType?.bedType ? (
              <p className="text-[13px] text-[#667085]">
                Default bed type for {selectedRoomType.name}: {selectedRoomType.bedType}
              </p>
            ) : null}

            {formError ? (
              <p className="text-[13px] text-[#C83B3B]">{formError}</p>
            ) : null}
          </div>
        </div>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  required,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[14px] text-[#667085]">
        {label}
        {required ? <span className="text-[#C34A2C]"> *</span> : null}
      </label>
      {children}
      {error ? <p className="text-[13px] text-[#C83B3B]">{error}</p> : null}
    </div>
  );
}

function fieldClassName(hasError: boolean) {
  return `h-11 w-full rounded-[4px] border bg-white px-3.5 text-[14px] text-[#344054] outline-none ${
    hasError
      ? "border-[#C83B3B] focus:border-[#C83B3B]"
      : "border-[#D0D5DD] focus:border-[#C34A2C]"
  }`;
}
