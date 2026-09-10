import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

export function Button({
  className,
  variant = "primary",
  size = "md",
  loading,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" && "bg-navy text-white hover:bg-navy-600",
        variant === "secondary" && "bg-brass text-white hover:bg-brass-600",
        variant === "ghost" && "text-ink-700 hover:bg-ink-100",
        variant === "danger" && "bg-red-800 text-white hover:bg-red-900",
        variant === "outline" && "border border-ink-200 bg-white text-ink-800 hover:bg-paper",
        size === "sm" && "h-9 px-3 text-sm",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-12 px-5 text-base",
        className
      )}
      {...props}
    >
      {loading ? "Please wait…" : children}
    </button>
  );
}
