"use client";

import { forwardRef, HTMLAttributes } from "react";
import { cn } from "../ui";

/**
 * Os tijolos de nó do canvas, na nossa linguagem.
 *
 * São os equivalentes dos componentes do React Flow UI (`BaseNode`,
 * `PlaceholderNode`). Não instalei os originais: eles chegam pelo CLI do
 * shadcn/ui e trazem junto a paleta e os tokens dele — `bg-background`,
 * `text-muted-foreground`, uma escala de raio e uma fonte própria. Este projeto
 * tem paleta e tipografia travadas, e o remédio seria pior que a doença.
 *
 * O que veio da referência é a forma e a API: um nó base com estados de seleção
 * e um nó fantasma que convida a criar o próximo. Ficam aqui, em
 * `components/fluxo`, para qualquer tela de canvas do sistema usar.
 */

export interface NoBaseProps extends HTMLAttributes<HTMLDivElement> {
  selecionado?: boolean;
  /** Estado de erro do bloco: filete vermelho, sem preencher o nó. */
  comErro?: boolean;
}

export const NoBase = forwardRef<HTMLDivElement, NoBaseProps>(function NoBase(
  { selecionado, comErro, className, children, ...resto },
  ref,
) {
  return (
    <div
      ref={ref}
      tabIndex={0}
      className={cn(
        "bg-ink-0 border rounded-md px-3 py-2 transition",
        "outline outline-2 outline-offset-2 outline-transparent focus-visible:outline-vw-blue",
        selecionado ? "border-vw-deep"
        : comErro ? "border-signal-stop/70"
        : "border-ink-300 hover:border-ink-500",
        className,
      )}
      {...resto}
    >
      {children}
    </div>
  );
});

/**
 * O nó fantasma: tracejado, no lugar onde o próximo bloco vai nascer.
 *
 * Ele substitui o botão que ficava no rodapé da tela. A diferença não é
 * estética: no rodapé, "adicionar" era um comando solto, e não dizia onde o
 * bloco entraria. Aqui o convite está no fim da linha, ligado por um traço ao
 * último bloco — o lugar é a própria resposta.
 */
export const NoFantasma = forwardRef<HTMLDivElement, NoBaseProps>(function NoFantasma(
  { className, children, ...resto },
  ref,
) {
  return (
    <div
      ref={ref}
      tabIndex={0}
      className={cn(
        "flex items-center justify-center rounded-md border border-dashed border-ink-400",
        "text-ink-500 transition cursor-pointer",
        "hover:border-vw-deep hover:text-vw-deep hover:bg-ink-0/60",
        "outline outline-2 outline-offset-2 outline-transparent focus-visible:outline-vw-blue",
        className,
      )}
      {...resto}
    >
      {children ?? <IconeMais />}
    </div>
  );
});

export function IconeMais({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn("w-5 h-5", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
