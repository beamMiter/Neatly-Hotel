import type { Metadata } from "next";
import { getCustomerBookings } from "@/server/queries/customer-bookings.query";
import { CustomerBookingsTable } from "@/features/customer-booking/components/CustomerBookingsTable";
import { SearchForm } from "@/components/ui/SearchForm";
import { Pagination } from "@/components/ui/Pagination";

export const metadata: Metadata = {
  title: "Customer Booking | Neatly Hotel Admin",
};

export default async function CustomerBookingPage(props: PageProps<"/customer-booking">) {
  const searchParams = await props.searchParams;
  const query = typeof searchParams.q === "string" && searchParams.q.trim() ? searchParams.q.trim() : undefined;
  const pageParam = typeof searchParams.page === "string" ? Number(searchParams.page) : 1;
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const { bookings, totalPages } = await getCustomerBookings({ query, page });

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-brand-border bg-white px-8 py-5">
        <h1 className="text-2xl font-semibold text-brand-body">Customer Booking</h1>
        <SearchForm defaultValue={query} />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
        <div className="overflow-hidden rounded-lg border border-brand-border bg-white">
          <CustomerBookingsTable bookings={bookings} />
        </div>
      </div>

      <Pagination basePath="/customer-booking" currentPage={page} totalPages={totalPages} query={query} />
    </div>
  );
}
