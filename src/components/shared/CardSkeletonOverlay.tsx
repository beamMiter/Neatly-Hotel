// ── CardSkeletonOverlay ───────────────────────────────────────────────
// Absolute-positioned skeleton placeholder for a saving/loading big-card
// form — pair with useDelayedFlag so it only appears once the wait has
// gone past the spinner-only window. Parent must be `relative`.
// แก้ไขได้: rows, columns

type CardSkeletonOverlayProps = {
  show: boolean;
  rows?: number;
  columns?: 1 | 2;
};

export function CardSkeletonOverlay({
  show,
  rows = 4,
  columns = 2,
}: CardSkeletonOverlayProps) {
  if (!show) return null;

  return (
    <div className="absolute inset-0 z-10 overflow-hidden rounded-lg bg-white/95 p-8 backdrop-blur-[1px]">
      <div
        className={`grid grid-cols-1 gap-x-6 gap-y-5 ${
          columns === 2 ? "md:grid-cols-2" : ""
        }`}
      >
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex flex-col gap-1.5">
            <div className="h-3.5 w-24 animate-pulse rounded bg-gray-200" />
            <div className="h-11 w-full animate-pulse rounded bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
