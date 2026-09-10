import { cn } from "@/lib/utils";
import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from "react";

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-ink-800">{label}</span>
      {children}
      {hint && !error ? <span className="block text-xs text-ink-400">{hint}</span> : null}
      {error ? <span className="block text-xs text-red-700">{error}</span> : null}
    </label>
  );
}

const control =
  "w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800 shadow-sm outline-none transition placeholder:text-ink-300 focus:border-navy focus:ring-2 focus:ring-navy/15";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, "min-h-[120px] resize-y", className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(control, className)} {...props} />;
}
