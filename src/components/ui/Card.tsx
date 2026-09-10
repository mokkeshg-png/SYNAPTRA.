import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-xl border border-ink-100 bg-white p-5 shadow-card", className)}>
      {children}
    </section>
  );
}

export function Badge({
  children,
  tone = "navy",
}: {
  children: React.ReactNode;
  tone?: "navy" | "brass" | "green" | "red" | "slate" | "amber";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tone === "navy" && "bg-navy-100 text-navy-700",
        tone === "brass" && "bg-brass-100 text-brass-600",
        tone === "green" && "bg-emerald-50 text-emerald-800",
        tone === "red" && "bg-red-50 text-red-800",
        tone === "slate" && "bg-ink-100 text-ink-600",
        tone === "amber" && "bg-amber-50 text-amber-900"
      )}
    >
      {children}
    </span>
  );
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-ink-100" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-navy transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-ink-200 bg-paper-50 px-6 py-12 text-center">
      <h3 className="font-serif text-lg text-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-6 text-sm text-red-900">
      <p>{message}</p>
      {onRetry ? (
        <button className="mt-3 font-medium underline" onClick={onRetry} type="button">
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-ink-500" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-200 border-t-navy" />
      {label}
    </div>
  );
}

export function PageHeader({
  kicker,
  title,
  description,
  actions,
}: {
  kicker?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {kicker ? <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brass">{kicker}</p> : null}
        <h1 className="mt-1 font-serif text-3xl text-ink md:text-4xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm text-ink-500">{description}</p> : null}
      </div>
      {actions}
    </div>
  );
}
