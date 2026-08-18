"use client";

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

export type EditGalleryItem =
  | { key: string; kind: "existing"; id: string; url: string }
  | { key: string; kind: "new"; file: File; previewUrl: string };

type EditRoomGalleryProps = {
  id: string;
  items: EditGalleryItem[];
  onChange: (items: EditGalleryItem[]) => void;
};

export function EditRoomGallery({ id, items, onChange }: EditRoomGalleryProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleAdd(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) {
      const newItems: EditGalleryItem[] = files.map((file) => ({
        key: crypto.randomUUID(),
        kind: "new",
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      onChange([...items, ...newItems]);
    }
    event.target.value = "";
  }

  function handleRemove(key: string) {
    const item = items.find((existingItem) => existingItem.key === key);
    if (item?.kind === "new") URL.revokeObjectURL(item.previewUrl);
    onChange(items.filter((existingItem) => existingItem.key !== key));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => item.key === active.id);
    const newIndex = items.findIndex((item) => item.key === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    onChange(arrayMove(items, oldIndex, newIndex));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((item) => item.key)} strategy={rectSortingStrategy}>
        <div className="flex flex-wrap gap-3">
          {items.map((item) => (
            <SortableThumb key={item.key} item={item} onRemove={() => handleRemove(item.key)} />
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

function SortableThumb({ item, onRemove }: { item: EditGalleryItem; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.key });
  const url = item.kind === "existing" ? item.url : item.previewUrl;

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
      <Image
        src={url}
        alt="Gallery preview"
        fill
        unoptimized={item.kind === "new"}
        className="rounded-md object-cover"
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove image"
        className="absolute -right-2 -top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-brand-ink text-white shadow"
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
