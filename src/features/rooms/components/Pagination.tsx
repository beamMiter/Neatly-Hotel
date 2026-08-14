import Link from "next/link";
import Image from "next/image";

const BASE_PATH = "/admin/room-property";

function buildHref(query: string | undefined, page: number) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${BASE_PATH}?${qs}` : BASE_PATH;
}

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  query?: string;
};

export function Pagination({ currentPage, totalPages, query }: PaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;

  return (
    <nav className="flex items-center justify-center gap-1 py-6" aria-label="Pagination">
      <Link
        href={buildHref(query, Math.max(1, currentPage - 1))}
        aria-disabled={isFirstPage}
        tabIndex={isFirstPage ? -1 : undefined}
        className={`flex h-8 w-8 items-center justify-center rounded-md ${
          isFirstPage ? "pointer-events-none opacity-40" : "hover:bg-brand-surface-alt"
        }`}
      >
        <Image src="/icons/icon/arrow-left.png" alt="Previous page" width={16} height={16} />
      </Link>

      {pages.map((page) => (
        <Link
          key={page}
          href={buildHref(query, page)}
          aria-current={page === currentPage ? "page" : undefined}
          className={`flex h-8 w-8 items-center justify-center rounded-md text-sm ${
            page === currentPage ? "bg-brand-ink text-white" : "text-brand-body hover:bg-brand-surface-alt"
          }`}
        >
          {page}
        </Link>
      ))}

      <Link
        href={buildHref(query, Math.min(totalPages, currentPage + 1))}
        aria-disabled={isLastPage}
        tabIndex={isLastPage ? -1 : undefined}
        className={`flex h-8 w-8 items-center justify-center rounded-md ${
          isLastPage ? "pointer-events-none opacity-40" : "hover:bg-brand-surface-alt"
        }`}
      >
        <Image src="/icons/icon/arrow-right.png" alt="Next page" width={16} height={16} />
      </Link>
    </nav>
  );
}
