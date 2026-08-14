"use client";

import { useState } from "react";
import Link from "next/link";
import { TextField } from "@/components/ui/TextField";
import { SelectField } from "@/components/ui/SelectField";
import { RoomImageUpload } from "@/features/rooms/components/RoomImageUpload";
import { RoomGalleryUpload } from "@/features/rooms/components/RoomGalleryUpload";
import { AmenitiesList } from "@/features/rooms/components/AmenitiesList";
import { BED_TYPES } from "@/features/rooms/types";

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

export function CreateRoomForm() {
  const [fields, setFields] = useState<FormFields>(initialFields);
  const [hasPromotion, setHasPromotion] = useState(false);
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [amenities, setAmenities] = useState<string[]>([""]);

  function handleFieldChange(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = event.target;
    setFields((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
            className="rounded-md bg-brand-primary px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover"
          >
            Create
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-8 py-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-8 rounded-lg border border-brand-border bg-white p-8">
          <section className="flex flex-col gap-5">
            <h2 className="text-sm font-medium text-brand-muted">Basic Information</h2>

            <TextField
              id="roomType"
              name="roomType"
              label="Room Type *"
              placeholder="Enter room type"
              value={fields.roomType}
              onChange={handleFieldChange}
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
              />

              <SelectField
                id="bedType"
                name="bedType"
                label="Bed type *"
                placeholder="Select bed type"
                value={fields.bedType}
                onChange={handleFieldChange}
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
              />

              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-2 text-sm text-brand-body">
                  <input
                    type="checkbox"
                    checked={hasPromotion}
                    onChange={(event) => setHasPromotion(event.target.checked)}
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
                  className="h-11 rounded-md border border-brand-border bg-white px-3.5 text-sm text-brand-body placeholder:text-brand-muted focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:bg-brand-surface-alt disabled:text-brand-muted"
                />
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
                className="rounded-md border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-body placeholder:text-brand-muted focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              />
            </div>
          </section>

          <hr className="border-t border-brand-border" />

          <section className="flex flex-col gap-4">
            <h2 className="text-sm font-medium text-brand-muted">Room Image</h2>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm text-brand-body">Main Image *</span>
              <RoomImageUpload id="mainImage" file={mainImage} onChange={setMainImage} />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm text-brand-body">Image Gallery(At least 4 pictures) *</span>
              <RoomGalleryUpload id="galleryImages" files={galleryFiles} onChange={setGalleryFiles} />
            </div>
          </section>

          <hr className="border-t border-brand-border" />

          <section className="flex flex-col gap-4">
            <h2 className="text-sm font-medium text-brand-muted">Room Amenities</h2>
            <AmenitiesList amenities={amenities} onChange={setAmenities} />
          </section>
        </div>
      </div>
    </form>
  );
}
