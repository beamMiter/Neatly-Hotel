import type { InputHTMLAttributes } from "react";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function TextField({ label, id, className, ...inputProps }: TextFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm text-brand-body">
        {label}
      </label>
      <input
        id={id}
        className={`h-11 rounded-md border border-brand-border bg-white px-3.5 text-sm text-brand-body placeholder:text-brand-muted focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary ${className ?? ""}`}
        {...inputProps}
      />
    </div>
  );
}
