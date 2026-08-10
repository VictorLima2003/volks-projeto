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
type BtnVariant = "primary" | "secondary" | "recusa" | "ghost" | "danger" | "go";

/**
 * O anel de foco é `outline`, não `border`: borda muda a geometria do botão ao
 * receber foco, e a lista de propriedades que o `transition` do Tailwind cobre
 * inclui `border-color` mas não `outline-color` — ou seja, como outline ele
 * aparece instantâneo, que é o requisito de quem navega por teclado.
 */
/** `group` para que ícone dentro do botão possa reagir ao hover do botão inteiro. */
const BTN_BASE =
  "group inline-flex items-center justify-center gap-2.5 px-6 h-12 rounded-full text-base font-semibold tracking-tight transition " +
  "outline outline-2 outline-offset-2 outline-transparent " +
  "active:translate-y-px";

/**
 * A cor do anel de foco mora aqui, e não na base, porque `outline-vw-blue` e
 * `outline-ink-0` são o mesmo utilitário: quem vence é a ordem da folha gerada,
 * não a ordem em que as classes aparecem na string. Declarar uma por variante
 * remove a disputa.
 */
const BTN_STYLES: Record<BtnVariant, string> = {
  primary: "bg-vw-deep text-ink-0 hover:bg-ink-800 focus-visible:outline-vw-blue",
  secondary: "bg-ink-0 text-ink-900 border border-vw-deep hover:bg-ink-100 focus-visible:outline-vw-blue",
  /*
   * Recusa: vermelho, mas vazado.
   *
   * Vermelho preenchido ao lado do primário deixa os dois com o mesmo peso, e
   * quem só varre a tela é atraído pelo bloco de cor mais quente — acaba
   * clicando em "não" por reflexo. Vazado ele continua inequivocamente vermelho
   * e continua sendo o segundo botão da linha.
   */
  recusa:
    "bg-ink-0 text-signal-stop border border-signal-stop hover:bg-signal-stop hover:text-ink-0 focus-visible:outline-signal-stop",
  ghost: "bg-transparent text-ink-900 hover:bg-ink-100 focus-visible:outline-vw-blue",
  danger: "bg-signal-stop text-ink-0 hover:opacity-90 focus-visible:outline-signal-stop",
  go: "bg-signal-go text-ink-0 hover:opacity-90 focus-visible:outline-signal-go",
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

/**
 * Seta do botão. No hover ela não desliza e volta: a que está em cena sai pela
 * direita e uma segunda entra pela esquerda, dentro de uma caixa que recorta.
 * Lê como avanço, e não como tremida.
 *
 * Duas cópias de um `<path>` — quatro segmentos não justificam uma biblioteca
 * de ícones, e misturar bibliotecas é o começo de páginas com três estilos de
 * ícone ao mesmo tempo.
 *
 * Depende do `group` do `BTN_BASE`, e reage também a `focus-visible`: quem
 * navega por teclado nunca dispara hover e veria um botão morto.
 */
export function SetaCta() {
  const desliza =
    "absolute inset-0 transition-transform duration-200 ease-out motion-reduce:transition-none";
  return (
    <span aria-hidden className="relative block h-4 w-4 overflow-hidden">
      <Seta className={cn(desliza, "group-hover:translate-x-5 group-focus-visible:translate-x-5")} />
      <Seta
        className={cn(
          desliza,
          "-translate-x-5 group-hover:translate-x-0 group-focus-visible:translate-x-0",
        )}
      />
    </span>
  );
}

function Seta({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={cn("h-4 w-4", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 8h11" />
      <path d="M9 3.5 13.5 8 9 12.5" />
    </svg>
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
        "inline-flex items-center px-2.5 h-7 rounded-full border text-xs font-semibold",
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
      className={cn("block text-sm font-semibold text-ink-700 mb-2", props.className)}
    />
  );
}

/**
 * A espessura da borda é a mesma em todos os estados. Trocá-la no foco empurra o
 * conteúdo em volta um pixel, e o campo "pula" quando você tabula até ele — por
 * isso o foco muda cor de borda e ganha `outline`, nunca engrossa.
 */
const FIELD =
  "block w-full bg-ink-0 border hairline-strong rounded-sm px-4 text-base text-ink-900 transition " +
  "focus:border-vw-deep " +
  "outline outline-2 outline-offset-1 outline-transparent focus-visible:outline-vw-blue " +
  "disabled:opacity-55 disabled:cursor-not-allowed";

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
    /* `ink-200` e não `ink-100`: a escala de papel (0/50/100) é quente de
       propósito e, numa faixa cheia atrás do cabeçalho da tabela, aquele quente
       lê como bege. Do 200 para cima a escala é cinza-frio, que é o que uma
       faixa estrutural pede. */
    <thead className="bg-ink-200 border-b-2 hairline-strong text-sm text-ink-700">
      {children}
    </thead>
  );
}
export function TH({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={cn("text-left font-semibold px-5 py-3.5", className)}>{children}</th>;
}
export function TR({ children, className }: { children: ReactNode; className?: string }) {
  // Mesmo motivo do cabeçalho: o hover era `ink-50`, quente. Cinza a 40% dá o
  // mesmo realce sem puxar a linha para o bege.
  return <tr className={cn("border-t hairline hover:bg-ink-200/40", className)}>{children}</tr>;
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
  /*
   * O sinal mora no número, não num filete grosso no topo.
   *
   * O filete de 4px era a coisa mais pesada do tile e disputava com o valor —
   * quatro ou seis deles lado a lado viravam uma fileira de traços coloridos
   * antes de virarem números. A cor no próprio valor diz o mesmo com o peso
   * certo, e todos os degraus de sinal passam de 4,5:1 sobre papel branco.
   */
  const cor: Record<BadgeTone, string> = {
    neutral: "",
    go: "text-signal-go",
    warn: "text-signal-warn",
    stop: "text-signal-stop",
    vw: "text-vw-deep",
  };
  return (
    <div className="bg-ink-0 border hairline rounded-md p-6 shadow-card">
      <div className="text-sm font-semibold text-ink-600">{label}</div>
      <div className={cn("display text-2xl mt-3", cor[tone])}>{value}</div>
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
