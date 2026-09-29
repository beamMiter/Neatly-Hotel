"use client";

import { useState } from "react";
import type { ChangeEvent } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import { PlusIcon } from "@/components/icons/PlusIcon";
import { CloseIcon } from "@/components/icons/CloseIcon";
import { GripIcon } from "@/components/icons/GripIcon";
import { ALLOWED_IMAGE_TYPES } from "@/features/rooms/validations";

type RoomGalleryUploadProps = {
  id: string;
  onChange: (files: File[]) => void;
};

type GalleryEntry = { key: string; file: File; previewUrl: string };

export function RoomGalleryUpload({ id, onChange }: RoomGalleryUploadProps) {
  const [entries, setEntries] = useState<GalleryEntry[]>([]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleAdd(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    if (selected.length > 0) {
      const added: GalleryEntry[] = selected.map((file) => ({
        key: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      const next = [...entries, ...added];
      setEntries(next);
      onChange(next.map((entry) => entry.file));
    }
    event.target.value = "";
  }

  function handleRemove(key: string) {
    const entry = entries.find((existing) => existing.key === key);
    if (entry) URL.revokeObjectURL(entry.previewUrl);
    const next = entries.filter((existing) => existing.key !== key);
    setEntries(next);
    onChange(next.map((existing) => existing.file));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = entries.findIndex((entry) => entry.key === active.id);
    const newIndex = entries.findIndex((entry) => entry.key === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const next = arrayMove(entries, oldIndex, newIndex);
    setEntries(next);
    onChange(next.map((entry) => entry.file));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={entries.map((entry) => entry.key)} strategy={rectSortingStrategy}>
        <div className="flex flex-wrap gap-3">
          {entries.map((entry) => (
            <SortableThumb key={entry.key} entry={entry} onRemove={() => handleRemove(entry.key)} />
          ))}

          <label
            htmlFor={id}
            className="flex h-32 w-32 cursor-pointer flex-col items-center justify-center gap-1 rounded-md bg-brand-surface-alt text-brand-primary transition-colors hover:bg-brand-border"
          >
            <PlusIcon className="h-5 w-5" />
            <span className="text-sm font-medium">Upload photo</span>
            <input
              id={id}
              type="file"
              accept={ALLOWED_IMAGE_TYPES.join(",")}
              multiple
              className="hidden"
              onChange={handleAdd}
            />
          </label>
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableThumb({ entry, onRemove }: { entry: GalleryEntry; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative h-32 w-32 touch-none ${isDragging ? "z-10 opacity-70" : ""}`}
    >
      <Image src={entry.previewUrl} alt="Gallery preview" fill unoptimized className="rounded-md object-cover" />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove image"
        className="absolute -right-2 -top-2 z-10 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-brand-ink text-white shadow"
      >
        <CloseIcon className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="absolute -left-2 -top-2 z-10 flex h-6 w-6 cursor-grab items-center justify-center rounded-full bg-white text-brand-muted shadow active:cursor-grabbing"
      >
        <GripIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
