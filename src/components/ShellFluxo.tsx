import Link from "next/link";
import { ReactNode } from "react";
import { LogoVW } from "./LogoVW";
import { Cabecalho, Migalha, Rodape } from "./Cabecalho";

/**
 * Cromo mínimo para as áreas de fluxo (motorista e vendedor): só a marca.
 * Sem menu — quem está preenchendo ou consultando não escolhe seção,
 * segue um caminho. A navegação acontece por migalha e por link contextual.
 */
export function ShellFluxo({
  area,
  crumbs,
  title,
  action,
  largura = "larga",
  children,
}: {
  /** Rótulo discreto ao lado da marca e destino do clique nela. */
  area: { label: string; href: string };
  crumbs?: Migalha[];
  title?: string;
  action?: ReactNode;
  /** "estreita" centraliza o conteúdo — usada no preenchimento passo a passo. */
  largura?: "larga" | "estreita";
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="h-1 bg-vw-deep" />

      <header className="border-b hairline">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center">
          <Link
            href={area.href}
            aria-label={`Volkswagen · ${area.label}`}
            className="flex items-center gap-3.5 group"
          >
            <LogoVW decorativo className="w-9 h-9 text-vw-deep transition group-hover:text-ink-900" />
            <span className="text-xs uppercase tracking-widest text-ink-600">{area.label}</span>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <div
          className={
            largura === "estreita"
              ? "max-w-2xl mx-auto px-6 py-12"
              : "max-w-7xl mx-auto px-6 py-10"
          }
        >
          <Cabecalho crumbs={crumbs} title={title} action={action} />
          {children}
        </div>
      </main>

      <Rodape />
    </div>
  );
}
