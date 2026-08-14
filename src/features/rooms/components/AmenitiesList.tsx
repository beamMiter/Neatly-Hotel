"use client";

import { GripIcon } from "@/components/icons/GripIcon";
import { PlusIcon } from "@/components/icons/PlusIcon";

type AmenitiesListProps = {
  amenities: string[];
  onChange: (amenities: string[]) => void;
};

export function AmenitiesList({ amenities, onChange }: AmenitiesListProps) {
  function handleAdd() {
    onChange([...amenities, ""]);
  }

  function handleUpdate(index: number, value: string) {
    onChange(amenities.map((amenity, amenityIndex) => (amenityIndex === index ? value : amenity)));
  }

  function handleRemove(index: number) {
    onChange(amenities.filter((_, amenityIndex) => amenityIndex !== index));
  }

  return (
    <div className="flex flex-col gap-3">
      {amenities.map((amenity, index) => (
        <div key={index} className="flex items-end gap-3">
          <GripIcon className="mb-2.5 h-4 w-4 shrink-0 text-brand-muted" />
          <div className="flex flex-1 flex-col gap-1.5">
            {index === 0 && (
              <label htmlFor={`amenity-${index}`} className="text-sm text-brand-body">
                Amenity *
              </label>
            )}
            <input
              id={`amenity-${index}`}
              type="text"
              value={amenity}
              onChange={(event) => handleUpdate(index, event.target.value)}
              placeholder="Enter amenity"
              className="h-11 rounded-md border border-brand-border bg-white px-3.5 text-sm text-brand-body placeholder:text-brand-muted focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            />
          </div>
          <button
            type="button"
            onClick={() => handleRemove(index)}
            className="mb-2.5 text-sm text-brand-muted transition-colors hover:text-red-600"
          >
            Delete
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={handleAdd}
        className="flex w-fit items-center gap-2 rounded-md border border-brand-primary px-4 py-2 text-sm font-semibold text-brand-primary transition-colors hover:bg-brand-primary hover:text-white"
      >
        <PlusIcon className="h-4 w-4" />
        Add Amenity
      </button>
    </div>
  );
}
