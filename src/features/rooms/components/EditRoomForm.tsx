"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TextField } from "@/components/ui/TextField";
import { SelectField } from "@/components/ui/SelectField";
import { ArrowLeftIcon } from "@/components/icons/ArrowLeftIcon";
import { EditMainImage } from "@/features/rooms/components/EditMainImage";
import {
  EditRoomGallery,
  type EditGalleryItem,
} from "@/features/rooms/components/EditRoomGallery";
import { AmenitiesList } from "@/features/rooms/components/AmenitiesList";
import { DeleteRoomModal } from "@/features/rooms/components/DeleteRoomModal";
import { useDelayedFlag } from "@/lib/useDelayedFlag";
import { CardSkeletonOverlay } from "@/components/shared/CardSkeletonOverlay";
import { BED_TYPES, type RoomTypeDetail } from "@/types/room-type";
import {
  MIN_GALLERY_IMAGES,
  createRoomSchema,
  type CreateRoomFieldErrors,
} from "@/features/rooms/validations";

const GUEST_OPTIONS = [1, 2, 3, 4, 5, 6];

type FormFields = {
  roomType: string;
  roomSizeSqm: string;
  bedType: string;
  guests: string;
  price: string;
  promotionPrice: string;
  description: string;
};

type MainImageState =
  | { kind: "existing"; id: string; url: string }
  | { kind: "new"; file: File; previewUrl: string }
  | null;

function fieldsFromRoom(room: RoomTypeDetail): FormFields {
  return {
    roomType: room.roomType,
    roomSizeSqm: room.roomSizeSqm ? String(room.roomSizeSqm) : "",
    bedType: room.bedType,
    guests: room.guests ? String(room.guests) : "",
    price: room.price ? String(room.price) : "",
    promotionPrice:
      room.promotionPrice === null ? "" : String(room.promotionPrice),
    description: room.description,
  };
}

export function EditRoomForm({ room }: { room: RoomTypeDetail }) {
  const router = useRouter();
  const [fields, setFields] = useState<FormFields>(() => fieldsFromRoom(room));
  const [hasPromotion, setHasPromotion] = useState(
    room.promotionPrice !== null,
  );
  const [mainImage, setMainImage] = useState<MainImageState>(
    room.mainImage
      ? { kind: "existing", id: room.mainImage.id, url: room.mainImage.url }
      : null,
  );
  const [galleryItems, setGalleryItems] = useState<EditGalleryItem[]>(() =>
    room.gallery.map((image) => ({
      key: image.id,
      kind: "existing" as const,
      id: image.id,
      url: image.url,
    })),
  );
  const [amenities, setAmenities] = useState<string[]>(
    room.amenities.length > 0 ? room.amenities : [""],
  );
  const [errors, setErrors] = useState<CreateRoomFieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const showSkeleton = useDelayedFlag(isSubmitting);
  const [formError, setFormError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  function handleFieldChange(
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) {
    const { name, value } = event.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) =>
      prev[name as keyof CreateRoomFieldErrors]
        ? { ...prev, [name]: undefined }
        : prev,
    );
  }

  function handleSelectMainImage(file: File) {
    setMainImage((prev) => {
      if (prev?.kind === "new") URL.revokeObjectURL(prev.previewUrl);
      return { kind: "new", file, previewUrl: URL.createObjectURL(file) };
    });
    setErrors((prev) =>
      prev.mainImage ? { ...prev, mainImage: undefined } : prev,
    );
  }

  function handleRemoveMainImage() {
    setMainImage((prev) => {
      if (prev?.kind === "new") URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
  }

  function handleGalleryChange(items: EditGalleryItem[]) {
    setGalleryItems(items);
    setErrors((prev) =>
      prev.gallery ? { ...prev, gallery: undefined } : prev,
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const record = {
      roomType: fields.roomType,
      roomSizeSqm: fields.roomSizeSqm,
      bedType: fields.bedType,
      guests: fields.guests,
      price: fields.price,
      promotionPrice: hasPromotion ? fields.promotionPrice : undefined,
      description: fields.description,
    };

    const parsed = createRoomSchema.safeParse(record);
    const fieldErrors: CreateRoomFieldErrors = {};

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof CreateRoomFieldErrors | undefined;
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
    }

    if (!mainImage) fieldErrors.mainImage = "Main image is required";

    if (galleryItems.length < MIN_GALLERY_IMAGES) {
      fieldErrors.gallery = `Upload at least ${MIN_GALLERY_IMAGES} gallery images`;
    }

    const trimmedAmenities = amenities
      .map((amenity) => amenity.trim())
      .filter(Boolean);
    if (trimmedAmenities.length === 0)
      fieldErrors.amenities = "Add at least one amenity";

    if (!parsed.success || Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("roomType", fields.roomType);
      formData.append("roomSizeSqm", fields.roomSizeSqm);
      formData.append("bedType", fields.bedType);
      formData.append("guests", fields.guests);
      formData.append("price", fields.price);
      // Sent as "" rather than omitted when checked-but-blank, so
      // parseUpdateRoomFormData can tell that apart from "no promotion
      // offered" and require a value instead of silently dropping it.
      if (hasPromotion) formData.append("promotionPrice", fields.promotionPrice);
      formData.append("description", fields.description);

      if (mainImage?.kind === "new") {
        formData.append("mainImage", mainImage.file);
      } else if (mainImage?.kind === "existing") {
        formData.append("mainImageId", mainImage.id);
      }

      const galleryOrder: string[] = [];
      let newFileIndex = 0;
      for (const item of galleryItems) {
        if (item.kind === "existing") {
          galleryOrder.push(`existing:${item.id}`);
        } else {
          galleryOrder.push(`new:${newFileIndex}`);
          formData.append("galleryNewFile", item.file);
          newFileIndex += 1;
        }
      }
      formData.append("galleryOrder", JSON.stringify(galleryOrder));

      for (const amenity of trimmedAmenities)
        formData.append("amenities", amenity);

      const response = await fetch(`/api/room-types/${room.id}`, {
        method: "PATCH",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        if (data.fieldErrors) setErrors(data.fieldErrors);
        setFormError(
          data.message ?? "Failed to update room. Please try again.",
        );
        return;
      }

      router.push("/room-property");
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/room-types/${room.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setFormError(
          data?.message ?? "Failed to delete room. Please try again.",
        );
        setIsDeleteModalOpen(false);
        return;
      }

      router.push("/room-property");
    } catch {
      setFormError("Something went wrong. Please try again.");
      setIsDeleteModalOpen(false);
    } finally {
      setIsDeleting(false);
    }
  }

  const mainImagePreviewUrl =
    mainImage?.kind === "existing"
      ? mainImage.url
      : (mainImage?.previewUrl ?? null);

  return (
    <>
      <form className="flex h-full flex-col" onSubmit={handleSubmit}>
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-brand-border bg-white px-8 py-5">
          <div className="flex items-center gap-3">
            <Link
              href="/room-property"
              aria-label="Back to Room & Property"
              className="text-brand-body transition-colors hover:text-brand-primary"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <h1 className="text-lg font-semibold text-brand-body">
              {room.roomType}
            </h1>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="cursor-pointer rounded-md bg-brand-primary px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Updating...
              </span>
            ) : (
              "Update"
            )}
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-8 py-8">
          <div className="relative mx-auto flex max-w-3xl flex-col gap-8 rounded-lg border border-brand-border bg-white p-8">
            {formError && (
              <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </p>
            )}

            <section className="flex flex-col gap-5">
              <h2 className="text-sm font-medium text-brand-muted">
                Basic Information
              </h2>

              <TextField
                id="roomType"
                name="roomType"
                label="Room Type *"
                placeholder="Enter room type"
                value={fields.roomType}
                onChange={handleFieldChange}
                error={errors.roomType}
              />

              <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
                <TextField
                  id="roomSizeSqm"
                  name="roomSizeSqm"
                  type="number"
                  min={1}
                  label="Room size(sqm) *"
                  placeholder="Enter room size"
                  value={fields.roomSizeSqm}
                  onChange={handleFieldChange}
                  error={errors.roomSizeSqm}
                />

                <SelectField
                  id="bedType"
                  name="bedType"
                  label="Bed type *"
                  placeholder="Select bed type"
                  value={fields.bedType}
                  onChange={handleFieldChange}
                  error={errors.bedType}
                >
                  {BED_TYPES.map((bedType) => (
                    <option key={bedType} value={bedType}>
                      {bedType}
                    </option>
                  ))}
                </SelectField>
              </div>

              <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
                <SelectField
                  id="guests"
                  name="guests"
                  label="Guest(s) *"
                  placeholder="Select guests"
                  value={fields.guests}
                  onChange={handleFieldChange}
                  error={errors.guests}
                >
                  {GUEST_OPTIONS.map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </SelectField>
                <div />
              </div>

              <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
                <TextField
                  id="price"
                  name="price"
                  type="number"
                  min={0}
                  step="0.01"
                  label="Price per Night(THB) *"
                  placeholder="Enter price"
                  value={fields.price}
                  onChange={handleFieldChange}
                  error={errors.price}
                />

                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-sm text-brand-body">
                    <input
                      type="checkbox"
                      checked={hasPromotion}
                      onChange={(event) => {
                        setHasPromotion(event.target.checked);
                        setErrors((prev) =>
                          prev.promotionPrice
                            ? { ...prev, promotionPrice: undefined }
                            : prev,
                        );
                      }}
                      className="h-4 w-4 rounded border-brand-border text-brand-primary focus:ring-brand-primary"
                    />
                    Promotion Price
                  </label>
                  <input
                    id="promotionPrice"
                    name="promotionPrice"
                    type="number"
                    min={0}
                    step="0.01"
                    disabled={!hasPromotion}
                    placeholder="Enter promotion price"
                    value={fields.promotionPrice}
                    onChange={handleFieldChange}
                    className={`h-11 rounded-md border bg-white px-3.5 text-sm text-brand-body placeholder:text-brand-muted focus:outline-none focus:ring-1 disabled:bg-brand-surface-alt disabled:text-brand-muted ${
                      errors.promotionPrice
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                        : "border-brand-border focus:border-brand-primary focus:ring-brand-primary"
                    }`}
                  />
                  {errors.promotionPrice && (
                    <p className="text-xs text-red-600">
                      {errors.promotionPrice}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="description"
                  className="text-sm text-brand-body"
                >
                  Room Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  placeholder="Enter room description"
                  value={fields.description}
                  onChange={handleFieldChange}
                  className={`rounded-md border bg-white px-3.5 py-2.5 text-sm text-brand-body placeholder:text-brand-muted focus:outline-none focus:ring-1 ${
                    errors.description
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                      : "border-brand-border focus:border-brand-primary focus:ring-brand-primary"
                  }`}
                />
                {errors.description && (
                  <p className="text-xs text-red-600">{errors.description}</p>
                )}
              </div>
            </section>

            <hr className="border-t border-brand-border" />

            <section className="flex flex-col gap-4">
              <h2 className="text-sm font-medium text-brand-muted">
                Room Image
              </h2>

              <div className="flex flex-col gap-1.5">
                <span className="text-sm text-brand-body">Main Image *</span>
                <EditMainImage
                  id="mainImage"
                  previewUrl={mainImagePreviewUrl}
                  isNewFile={mainImage?.kind === "new"}
                  onSelect={handleSelectMainImage}
                  onRemove={handleRemoveMainImage}
                />
                {errors.mainImage && (
                  <p className="text-xs text-red-600">{errors.mainImage}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-sm text-brand-body">
                  Image Gallery(At least {MIN_GALLERY_IMAGES} pictures) *
                </span>
                <EditRoomGallery
                  id="galleryImages"
                  items={galleryItems}
                  onChange={handleGalleryChange}
                />
                {errors.gallery && (
                  <p className="text-xs text-red-600">{errors.gallery}</p>
                )}
              </div>
            </section>

            <hr className="border-t border-brand-border" />

            <section className="flex flex-col gap-4">
              <h2 className="text-sm font-medium text-brand-muted">
                Room Amenities
              </h2>
              <AmenitiesList amenities={amenities} onChange={setAmenities} />
              {errors.amenities && (
                <p className="text-xs text-red-600">{errors.amenities}</p>
              )}
            </section>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="cursor-pointer text-sm text-brand-muted transition-colors hover:text-red-600"
              >
                Delete Room
              </button>
            </div>

            <CardSkeletonOverlay show={showSkeleton} rows={6} />
          </div>
        </div>
      </form>

      <DeleteRoomModal
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </>
  );
}
