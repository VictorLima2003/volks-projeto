import Link from "next/link";
import { ReactNode } from "react";
import { cn } from "./ui";
import { LogoVW } from "./LogoVW";
import { SeletorUsuario } from "./SeletorUsuario";
import { Cabecalho, Migalha, Rodape } from "./Cabecalho";

export type SecaoGestor = "campanhas" | "aprovacoes" | "central" | "dashboard" | null;

const secoes: { id: Exclude<SecaoGestor, null>; label: string; href: string }[] = [
  { id: "campanhas",  label: "Campanhas",  href: "/gestor" },
  { id: "aprovacoes", label: "Aprovações", href: "/gestor/aprovacoes" },
  { id: "central",    label: "Central",    href: "/gestor/central" },
  { id: "dashboard",  label: "Dashboard",  href: "/gestor/dashboard" },
];

/**
 * Área do gestor — a única com navegação interna, porque é a única que tem
 * várias seções. Motorista e vendedor são fluxos focados e não têm menu.
 */
export function ShellGestor({
  secao = null,
  crumbs,
  title,
  action,
  largura = "padrao",
  children,
}: {
  secao?: SecaoGestor;
  crumbs?: Migalha[];
  title?: string;
  action?: ReactNode;
  /** "ampla" solta o limite de leitura — telas de construção precisam do espaço. */
  largura?: "padrao" | "ampla";
  children: ReactNode;
}) {
  const container = largura === "ampla" ? "max-w-[1600px]" : "max-w-7xl";
  return (
    <div className="min-h-screen flex flex-col">
      <div className="h-1 bg-vw-deep" />

      <header className="border-b hairline sticky top-0 z-30 bg-ink-0/97 backdrop-blur">
        <div className={`${container} mx-auto px-6 h-20 flex items-center gap-8`}>
          <Link
            href="/gestor"
            aria-label="Volkswagen · área do gestor"
            className="flex items-center gap-3.5 group shrink-0"
          >
            <LogoVW decorativo className="w-9 h-9 text-vw-deep transition group-hover:text-ink-900" />
            <span className="text-xs uppercase tracking-widest text-ink-600 hidden lg:inline">
              Gestor
            </span>
          </Link>

          <nav className="flex items-center gap-1 overflow-x-auto">
            {secoes.map((s) => (
              <Link
                key={s.id}
                href={s.href}
                className={cn(
                  "px-4 h-10 inline-flex items-center rounded-full text-base tracking-tight transition whitespace-nowrap",
                  secao === s.id
                    ? "bg-vw-deep text-ink-0"
                    : "text-ink-700 hover:text-ink-900 hover:bg-ink-100",
                )}
              >
                {s.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto shrink-0">
            <SeletorUsuario />
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className={`${container} mx-auto px-6 py-10`}>
          <Cabecalho crumbs={crumbs} title={title} action={action} />
          {children}
        </div>
      </main>

      <Rodape />
    </div>
  );
}
