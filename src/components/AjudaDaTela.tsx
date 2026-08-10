"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "./ui";

/**
 * Explicação da tela, ao lado do título.
 *
 * Antes esses textos eram um bloco no pé da página — abaixo de tabelas longas,
 * onde só chega quem rola até o fim, e justamente quem já entendeu a tela. A
 * dúvida acontece na chegada, então a explicação passa a morar onde o olho
 * começa: encostada no h1.
 *
 * Abre por clique, não por passar o mouse. Passar o mouse não existe no celular,
 * e conteúdo com título e lista não cabe num rótulo flutuante que some quando o
 * ponteiro sai do caminho.
 */
export function AjudaDaTela({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  // Esc fecha, como qualquer camada sobreposta do sistema.
  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberto]);

  return (
    <span className="relative inline-flex align-middle" ref={caixa}>
      <button
        type="button"
        aria-expanded={aberto}
        aria-label={`Sobre esta tela: ${titulo}`}
        onClick={() => setAberto((a) => !a)}
        className={cn(
          "w-7 h-7 rounded-full border hairline-strong inline-flex items-center justify-center transition",
          "outline outline-2 outline-offset-2 outline-transparent focus-visible:outline-vw-blue",
          aberto
            ? "bg-vw-deep text-ink-0 border-vw-deep"
            : "text-ink-600 hover:text-ink-900 hover:border-vw-deep",
        )}
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9.3 9a2.8 2.8 0 1 1 3.7 2.7c-.7.3-1 .9-1 1.6v.4" />
          <path d="M12 17.4v.1" />
        </svg>
      </button>

      {aberto && (
        <>
          {/* Captura o clique de fora. Sem isto, o painel só fecha pelo botão. */}
          <span className="fixed inset-0 z-40" onClick={() => setAberto(false)} />
          <div
            role="dialog"
            aria-label={titulo}
            className="absolute left-0 top-full mt-3 z-50 w-[min(26rem,calc(100vw-3rem))]
                       bg-ink-0 border hairline-strong rounded-md shadow-lift p-6 text-left"
          >
            <div className="text-sm font-semibold text-ink-900 mb-3">{titulo}</div>
            <div className="text-sm text-ink-700 space-y-3">{children}</div>
          </div>
        </>
      )}
    </span>
  );
}

/** Um item da explicação: o termo e o que ele quer dizer. */
export function ItemAjuda({ termo, children }: { termo: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-ink-900 font-medium">{termo}</div>
      <p className="mt-0.5">{children}</p>
    </div>
  );
}
