import { SearchIcon } from "@/components/icons/SearchIcon";

type SearchFormProps = {
  defaultValue?: string;
  placeholder?: string;
};

export function SearchForm({ defaultValue, placeholder = "Search..." }: SearchFormProps) {
  return (
    <form className="relative w-full max-w-xs">
      <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="h-10 w-full rounded-md border border-brand-border bg-white pl-10 pr-3.5 text-sm text-brand-body placeholder:text-brand-muted focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
      />
    </form>
  );
}
