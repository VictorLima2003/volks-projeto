import Link from "next/link";
import { ReactNode } from "react";

export interface Migalha {
  label: string;
  href?: string;
}

/**
 * Bloco de título da página: migalhas, H1 e ação.
 * Compartilhado pelas três áreas — o que muda entre elas é o cromo em volta.
 */
export function Cabecalho({
  crumbs,
  title,
  action,
}: {
  crumbs?: Migalha[];
  title?: string;
  action?: ReactNode;
}) {
  if (!crumbs && !title && !action) return null;

  return (
    <div className="mb-10">
      {crumbs && crumbs.length > 0 && (
        <div className="text-xs font-bold uppercase tracking-widest text-ink-600 mb-4">
          {crumbs.map((c, i) => (
            <span key={i}>
              {c.href ? (
                <Link href={c.href} className="hover:text-vw-deep">{c.label}</Link>
              ) : (
                <span>{c.label}</span>
              )}
              {i < crumbs.length - 1 && <span className="mx-2.5 text-ink-600">/</span>}
            </span>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        {title && <h1 className="display text-3xl md:text-4xl">{title}</h1>}
        {action}
      </div>
    </div>
  );
}

export function Rodape({ nota }: { nota?: string }) {
  return (
    <footer className="border-t hairline mt-16">
      <div className="max-w-7xl mx-auto px-6 h-20 flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-widest text-ink-600">
        <span>{nota ?? "Protótipo · dados em memória"}</span>
        <span>Wolks · Uber × Volkswagen</span>
      </div>
    </footer>
  );
}
