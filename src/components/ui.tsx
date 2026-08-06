import Link from "next/link";
import { HTMLAttributes, InputHTMLAttributes, LabelHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

// --------------------------------------------------------------------------
// Utility
// --------------------------------------------------------------------------
export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

// --------------------------------------------------------------------------
// Card / Section
// --------------------------------------------------------------------------
export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={cn(
        "bg-ink-0 border hairline rounded-md p-7 shadow-card",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mb-12">
      <div className="flex items-end justify-between mb-5">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          {description && <p className="text-base text-ink-600 mt-2 max-w-2xl">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

// --------------------------------------------------------------------------
// Button — pílula, no idioma visual da VW
// --------------------------------------------------------------------------
type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "go";

const BTN_BASE =
  "inline-flex items-center justify-center gap-2 px-6 h-12 rounded-full text-base font-semibold tracking-tight transition";

const BTN_STYLES: Record<BtnVariant, string> = {
  primary: "bg-vw-deep text-ink-0 hover:bg-ink-800",
  secondary: "bg-ink-0 text-ink-900 border-2 border-vw-deep hover:bg-ink-100",
  ghost: "bg-transparent text-ink-900 hover:bg-ink-100",
  danger: "bg-signal-stop text-ink-0 hover:opacity-90",
  go: "bg-signal-go text-ink-0 hover:opacity-90",
};

export function Button({
  variant = "primary",
  className,
  children,
  ...rest
}: {
  variant?: BtnVariant;
} & HTMLAttributes<HTMLButtonElement> & { type?: "button" | "submit"; disabled?: boolean; form?: string }) {
  return (
    <button
      {...rest}
      className={cn(
        BTN_BASE,
        "disabled:opacity-40 disabled:cursor-not-allowed",
        BTN_STYLES[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  variant = "primary",
  children,
  className,
}: {
  href: string;
  variant?: BtnVariant;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={cn(BTN_BASE, BTN_STYLES[variant], className)}>
      {children}
    </Link>
  );
}

// --------------------------------------------------------------------------
// Badge
// --------------------------------------------------------------------------
type BadgeTone = "neutral" | "go" | "warn" | "stop" | "vw";
export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  const tones: Record<BadgeTone, string> = {
    neutral: "bg-ink-200 text-ink-800 border-ink-400",
    go: "bg-signal-go/10 text-signal-go border-signal-go/45",
    warn: "bg-signal-warn/10 text-signal-warn border-signal-warn/45",
    stop: "bg-signal-stop/10 text-signal-stop border-signal-stop/45",
    vw: "bg-vw-deep/10 text-vw-deep border-vw-deep/45",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 h-7 rounded-full border text-xs font-bold uppercase tracking-wide",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

// --------------------------------------------------------------------------
// Form primitives
// --------------------------------------------------------------------------
export function Label(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      {...props}
      className={cn("block text-xs font-bold uppercase tracking-wide text-ink-700 mb-2", props.className)}
    />
  );
}

const FIELD =
  "block w-full bg-ink-0 border-2 hairline-strong rounded-sm px-4 text-base text-ink-900 focus:outline-none focus:border-vw-deep transition";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(FIELD, "h-12", props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(FIELD, "min-h-28 py-3", props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(FIELD, "h-12 appearance-none", props.className)} />;
}

// --------------------------------------------------------------------------
// Table
// --------------------------------------------------------------------------
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="border hairline rounded-md overflow-x-auto">
      <table className="w-full text-base">{children}</table>
    </div>
  );
}
export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-ink-100 border-b-2 hairline-strong text-xs uppercase tracking-wide text-ink-700">
      {children}
    </thead>
  );
}
export function TH({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={cn("text-left font-bold px-5 py-3.5", className)}>{children}</th>;
}
export function TR({ children, className }: { children: ReactNode; className?: string }) {
  return <tr className={cn("border-t hairline hover:bg-ink-50", className)}>{children}</tr>;
}
export function TD({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("px-5 py-4 align-middle", className)}>{children}</td>;
}

// --------------------------------------------------------------------------
// Stat
// --------------------------------------------------------------------------
export function Stat({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: BadgeTone;
}) {
  const accent: Record<BadgeTone, string> = {
    neutral: "border-t-ink-900",
    go: "border-t-signal-go",
    warn: "border-t-signal-warn",
    stop: "border-t-signal-stop",
    vw: "border-t-vw-deep",
  };
  return (
    <div className={cn("bg-ink-0 border hairline rounded-md border-t-4 p-6 shadow-card", accent[tone])}>
      <div className="text-xs font-bold uppercase tracking-wide text-ink-600">{label}</div>
      <div className="display text-2xl mt-3">{value}</div>
      {hint && <div className="text-sm text-ink-600 mt-2.5">{hint}</div>}
    </div>
  );
}

// --------------------------------------------------------------------------
// Kbd / Mono
// --------------------------------------------------------------------------
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <span className="mono text-xs bg-ink-100 border hairline-strong rounded-sm px-2 py-1">
      {children}
    </span>
  );
}
