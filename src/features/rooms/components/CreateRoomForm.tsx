"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TextField } from "@/components/ui/TextField";
import { SelectField } from "@/components/ui/SelectField";
import { RoomImageUpload } from "@/features/rooms/components/RoomImageUpload";
import { RoomGalleryUpload } from "@/features/rooms/components/RoomGalleryUpload";
import { AmenitiesList } from "@/features/rooms/components/AmenitiesList";
import { BED_TYPES } from "@/features/rooms/types";
import { MIN_GALLERY_IMAGES, parseCreateRoomFormData, type CreateRoomFieldErrors } from "@/features/rooms/validations";

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

const initialFields: FormFields = {
  roomType: "",
  roomSizeSqm: "",
  bedType: "",
  guests: "",
  price: "",
  promotionPrice: "",
  description: "",
};

function buildFormData(fields: FormFields, hasPromotion: boolean, mainImage: File | null, gallery: File[], amenities: string[]) {
  const formData = new FormData();
  formData.append("roomType", fields.roomType);
  formData.append("roomSizeSqm", fields.roomSizeSqm);
  formData.append("bedType", fields.bedType);
  formData.append("guests", fields.guests);
  formData.append("price", fields.price);
  if (hasPromotion && fields.promotionPrice) formData.append("promotionPrice", fields.promotionPrice);
  formData.append("description", fields.description);
  if (mainImage) formData.append("mainImage", mainImage);
  for (const file of gallery) formData.append("gallery", file);
  for (const amenity of amenities) formData.append("amenities", amenity);
  return formData;
}

export function CreateRoomForm() {
  const router = useRouter();
  const [fields, setFields] = useState<FormFields>(initialFields);
  const [hasPromotion, setHasPromotion] = useState(false);
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [amenities, setAmenities] = useState<string[]>([""]);
  const [errors, setErrors] = useState<CreateRoomFieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function handleFieldChange(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = event.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => (prev[name as keyof CreateRoomFieldErrors] ? { ...prev, [name]: undefined } : prev));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const formData = buildFormData(fields, hasPromotion, mainImage, galleryFiles, amenities);
    const parsed = parseCreateRoomFormData(formData);

    if (!parsed.success) {
      setErrors(parsed.fieldErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/room-types", { method: "POST", body: formData });
      const data = await response.json();

      if (!response.ok) {
        if (data.fieldErrors) setErrors(data.fieldErrors);
        setFormError(data.message ?? "Failed to create room. Please try again.");
        return;
      }

      router.push("/room-property");
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="flex h-full flex-col" onSubmit={handleSubmit}>
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-brand-border bg-white px-8 py-5">
        <h1 className="text-lg font-semibold text-brand-body">Create New Room</h1>

        <div className="flex items-center gap-3">
          <Link
            href="/room-property"
            className="rounded-md border border-brand-primary px-5 py-2 text-sm font-semibold text-brand-primary transition-colors hover:bg-brand-surface-alt"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="cursor-pointer rounded-md bg-brand-primary px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Creating..." : "Create"}
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-8 py-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-8 rounded-lg border border-brand-border bg-white p-8">
          {formError && <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</p>}

          <section className="flex flex-col gap-5">
            <h2 className="text-sm font-medium text-brand-muted">Basic Information</h2>

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
                      setErrors((prev) => (prev.promotionPrice ? { ...prev, promotionPrice: undefined } : prev));
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
                {errors.promotionPrice && <p className="text-xs text-red-600">{errors.promotionPrice}</p>}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="description" className="text-sm text-brand-body">
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
              {errors.description && <p className="text-xs text-red-600">{errors.description}</p>}
            </div>
          </section>

          <hr className="border-t border-brand-border" />

          <section className="flex flex-col gap-4">
            <h2 className="text-sm font-medium text-brand-muted">Room Image</h2>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm text-brand-body">Main Image *</span>
              <RoomImageUpload
                id="mainImage"
                file={mainImage}
                onChange={(file) => {
                  setMainImage(file);
                  setErrors((prev) => (prev.mainImage ? { ...prev, mainImage: undefined } : prev));
                }}
              />
              {errors.mainImage && <p className="text-xs text-red-600">{errors.mainImage}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm text-brand-body">Image Gallery(At least {MIN_GALLERY_IMAGES} pictures) *</span>
              <RoomGalleryUpload
                id="galleryImages"
                files={galleryFiles}
                onChange={(files) => {
                  setGalleryFiles(files);
                  setErrors((prev) => (prev.gallery ? { ...prev, gallery: undefined } : prev));
                }}
              />
              {errors.gallery && <p className="text-xs text-red-600">{errors.gallery}</p>}
            </div>
          </section>

          <hr className="border-t border-brand-border" />

          <section className="flex flex-col gap-4">
            <h2 className="text-sm font-medium text-brand-muted">Room Amenities</h2>
            <AmenitiesList
              amenities={amenities}
              onChange={(next) => {
                setAmenities(next);
                setErrors((prev) => (prev.amenities ? { ...prev, amenities: undefined } : prev));
              }}
            />
            {errors.amenities && <p className="text-xs text-red-600">{errors.amenities}</p>}
          </section>
        </div>
      </div>
    </form>
  );
}
