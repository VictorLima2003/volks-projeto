"use client";

import { Label } from "./ui";

/**
 * Seleção múltipla em "pílulas". Mais direta que um <select multiple>,
 * que no navegador exige Ctrl+clique e ninguém descobre sozinho.
 */
export function SelecaoMultipla({
  label,
  opcoes,
  valor,
  onChange,
  atalhos,
  ajuda,
}: {
  label: string;
  opcoes: { valor: string; rotulo: string }[];
  valor: string[];
  onChange: (v: string[]) => void;
  /** Grupos que marcam vários de uma vez, ex.: regiões. */
  atalhos?: Record<string, string[]>;
  ajuda?: string;
}) {
  function alternar(v: string) {
    onChange(valor.includes(v) ? valor.filter((x) => x !== v) : [...valor, v]);
  }

  function aplicarAtalho(itens: string[]) {
    const todosMarcados = itens.every((i) => valor.includes(i));
    onChange(
      todosMarcados
        ? valor.filter((v) => !itens.includes(v))
        : Array.from(new Set([...valor, ...itens])),
    );
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 mb-2">
        <Label className="mb-0">{label}</Label>
        <span className="text-xs text-ink-600">
          {valor.length === 0 ? "nenhum" : `${valor.length} selecionado(s)`}
        </span>
      </div>

      {atalhos && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {Object.entries(atalhos).map(([nome, itens]) => {
            const ativo = itens.every((i) => valor.includes(i));
            return (
              <button
                key={nome}
                type="button"
                onClick={() => aplicarAtalho(itens)}
                className={
                  "px-3 h-8 rounded-full text-xs font-semibold border transition " +
                  (ativo
                    ? "bg-ink-900 text-ink-0 border-ink-900"
                    : "border-ink-300 text-ink-700 hover:border-ink-900")
                }
              >
                {nome}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {opcoes.map((o) => {
          const ativo = valor.includes(o.valor);
          return (
            <button
              key={o.valor}
              type="button"
              aria-pressed={ativo}
              onClick={() => alternar(o.valor)}
              className={
                "px-4 h-10 rounded-full text-sm font-medium border transition " +
                (ativo
                  ? "bg-vw-deep text-ink-0 border-vw-deep"
                  : "bg-ink-0 text-ink-800 border-ink-300 hover:border-vw-deep")
              }
            >
              {o.rotulo}
            </button>
          );
        })}
      </div>

      {ajuda && <p className="text-xs text-ink-600 mt-2.5">{ajuda}</p>}
    </div>
  );
}
