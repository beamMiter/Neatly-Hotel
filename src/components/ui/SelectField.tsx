import type { SelectHTMLAttributes } from "react";
import { ChevronDownIcon } from "@/src/components/icons/ChevronDownIcon";

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  placeholder: string;
};

export function SelectField({ label, id, placeholder, className, children, ...selectProps }: SelectFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm text-brand-body">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          defaultValue=""
          className={`h-11 w-full appearance-none rounded-md border border-brand-border bg-white px-3.5 pr-10 text-sm text-brand-body focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary ${className ?? ""}`}
          {...selectProps}
        >
          <option value="" disabled className="text-brand-muted">
            {placeholder}
          </option>
          {children}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
      </div>
    </div>
  );
}
