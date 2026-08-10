import { useId } from "react";
import { cn } from "./ui";

/**
 * Trama de pontos para fundo. Um `<pattern>` de SVG, que o navegador repete
 * sozinho — nada de gerar centenas de elementos.
 *
 * Decoração: `aria-hidden` e sem eventos de ponteiro. Quem usa aplica uma
 * máscara pela `className` para a trama sumir antes de encostar no texto; sem
 * isso ela cobre a seção inteira e briga com a leitura.
 */
export function PadraoPontos({
  espaco = 22,
  raio = 1,
  className,
}: {
  /** Distância entre pontos, em px. */
  espaco?: number;
  /** Raio de cada ponto, em px. */
  raio?: number;
  className?: string;
}) {
  // O id precisa ser único por instância: dois `<pattern>` com o mesmo id fazem
  // o segundo referenciar o primeiro. `useId` traz dois-pontos, que não valem
  // em toda referência de SVG.
  const id = `pontos-${useId().replace(/:/g, "")}`;

  return (
    <svg
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
    >
      <defs>
        <pattern
          id={id}
          width={espaco}
          height={espaco}
          patternUnits="userSpaceOnUse"
          patternContentUnits="userSpaceOnUse"
        >
          <circle cx={raio} cy={raio} r={raio} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${id})`} />
    </svg>
  );
}
