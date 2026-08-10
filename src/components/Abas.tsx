"use client";

import { ReactNode } from "react";
import { cn } from "./ui";

export interface Aba {
  id: string;
  rotulo: string;
  contagem?: number;
}

/**
 * Abas de trabalho. Cada aba é um contexto inteiro da tela, não um filtro —
 * por isso ocupam a largura e ficam ancoradas numa régua.
 */
export function Abas({
  abas,
  ativa,
  onMudar,
  acessorio,
}: {
  abas: Aba[];
  ativa: string;
  onMudar: (id: string) => void;
  /** Conteúdo alinhado à direita da régua, ex.: botão de salvar. */
  acessorio?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 border-b hairline-strong mb-8">
      <div role="tablist" className="flex gap-1">
        {abas.map((a) => {
          const selecionada = a.id === ativa;
          return (
            <button
              key={a.id}
              role="tab"
              aria-selected={selecionada}
              onClick={() => onMudar(a.id)}
              className={cn(
                "relative px-5 h-12 text-base tracking-tight transition -mb-0.5 border-b-2",
                selecionada
                  ? "text-ink-900 font-semibold border-vw-deep"
                  : "text-ink-600 hover:text-ink-900 border-transparent",
              )}
            >
              {a.rotulo}
              {a.contagem !== undefined && (
                <span
                  className={cn(
                    "ml-2.5 text-xs rounded-full px-2 py-0.5 font-semibold",
                    selecionada ? "bg-vw-deep text-ink-0" : "bg-ink-200 text-ink-700",
                  )}
                >
                  {a.contagem}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {acessorio && <div className="pb-3">{acessorio}</div>}
    </div>
  );
}
