"use client";

import { useState } from "react";
import { RoomImagePlaceholder } from "@/features/booking/components/RoomImagePlaceholder";

type ImageCarouselProps = {
  name: string;
  imageCount: number;
};

export function ImageCarousel({ name, imageCount }: ImageCarouselProps) {
  const count = Math.max(imageCount, 1);
  const [index, setIndex] = useState(0);

  const prevIndex = (index - 1 + count) % count;
  const nextIndex = (index + 1) % count;

  function goPrev() {
    setIndex((current) => (current - 1 + count) % count);
  }

  function goNext() {
    setIndex((current) => (current + 1) % count);
  }

  return (
    <div className="relative flex h-[280px] items-stretch overflow-hidden bg-brand-surface-alt sm:h-[380px] lg:h-[460px]">
      <div className="relative hidden w-[18%] sm:block">
        <RoomImagePlaceholder
          label={`${name} ${prevIndex + 1}`}
          index={prevIndex}
          className="h-full w-full"
        />
        <CarouselArrow direction="prev" onClick={goPrev} />
      </div>

      <div className="relative min-w-0 flex-1">
        <RoomImagePlaceholder
          label={`${name} ${index + 1}`}
          index={index}
          className="h-full w-full"
        />
        <CarouselArrow direction="prev" onClick={goPrev} className="sm:hidden" />
        <CarouselArrow direction="next" onClick={goNext} className="sm:hidden" />
      </div>

      <div className="relative hidden w-[18%] sm:block">
        <RoomImagePlaceholder
          label={`${name} ${nextIndex + 1}`}
          index={nextIndex}
          className="h-full w-full"
        />
        <CarouselArrow direction="next" onClick={goNext} />
      </div>
    </div>
  );
}

function CarouselArrow({
  direction,
  onClick,
  className = "",
}: {
  direction: "prev" | "next";
  onClick: () => void;
  className?: string;
}) {
  const isPrev = direction === "prev";

  return (
    <button
      type="button"
      aria-label={isPrev ? "Previous photo" : "Next photo"}
      onClick={onClick}
      className={`absolute top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-brand-ink shadow ${
        isPrev ? "left-3" : "right-3"
      } ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        {isPrev ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
      </svg>
    </button>
  );
}
