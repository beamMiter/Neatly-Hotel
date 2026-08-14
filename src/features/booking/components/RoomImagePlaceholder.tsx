type RoomImagePlaceholderProps = {
  label?: string;
  index?: number;
  className?: string;
  showGalleryHint?: boolean;
};

const TONES = ["#d8d8de", "#c9c9d2", "#bdbdc8", "#e2e2e8"];

export function RoomImagePlaceholder({
  label = "Photo",
  index = 0,
  className = "",
  showGalleryHint = false,
}: RoomImagePlaceholderProps) {
  const tone = TONES[index % TONES.length];

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{ backgroundColor: tone }}
      aria-label={label}
    >
      <span className="text-xs font-medium tracking-wide text-white/80 uppercase">{label}</span>
      {showGalleryHint && (
        <span className="absolute bottom-3 left-3 flex h-7 w-7 items-center justify-center rounded-sm bg-black/35 text-white">
          <GalleryIcon />
        </span>
      )}
    </div>
  );
}

function GalleryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-4 w-4">
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <circle cx="8.5" cy="10" r="1.2" fill="currentColor" stroke="none" />
      <path d="M3 16.5 8 12l4 3.5 3-2.5 6 5" />
    </svg>
  );
}
