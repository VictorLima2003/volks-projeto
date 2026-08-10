"use client";

import { animate, stagger, svg } from "animejs";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LogoUber } from "./LogoUber";

/**
 * Marca do cabeçalho: o símbolo Volkswagen e o da Uber, separados por um filete.
 *
 * O símbolo VW se desenha na entrada, pelo `svg.createDrawable` do anime.js —
 * ele é traço, então dá para desenhar. O da Uber é preenchimento e não tem traço
 * para percorrer; entra por opacidade e deslocamento, logo depois, para as duas
 * lerem como uma sequência e não como duas animações concorrentes.
 */
export function MarcaCabecalho({
  href,
  rotulo,
  tom = "escuro",
}: {
  href: string;
  /** Nome da área, para o leitor de tela distinguir os links de marca. */
  rotulo: string;
  /** "claro" para uso sobre superfície escura. */
  tom?: "escuro" | "claro";
}) {
  const vw = useRef<SVGSVGElement>(null);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    const marca = vw.current;
    if (!marca) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPronto(true);
      return;
    }

    const tracos = Array.from(marca.querySelectorAll<SVGPathElement>("[data-traco]"));
    const desenho = animate(svg.createDrawable(tracos), {
      draw: ["0 0", "0 1"],
      ease: "outQuad",
      duration: 900,
      delay: stagger(90),
    });
    setPronto(true);

    return () => {
      desenho.revert();
    };
  }, []);

  const claro = tom === "claro";

  return (
    <Link
      href={href}
      aria-label={`Volkswagen · Uber · ${rotulo}`}
      className={`inline-flex items-center gap-3.5 rounded-sm outline outline-2 outline-offset-4 outline-transparent ${
        claro ? "focus-visible:outline-ink-0" : "focus-visible:outline-vw-blue"
      }`}
    >
      <svg
        ref={vw}
        viewBox="0 0 100 100"
        aria-hidden
        className={`w-9 h-9 shrink-0 transition-opacity duration-150 ${
          claro ? "text-ink-0" : "text-vw-deep"
        } ${pronto ? "opacity-100" : "opacity-0"}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={6}
        strokeLinejoin="miter"
        strokeMiterlimit={3}
      >
        {/* Anel em dois arcos: `createDrawable` não aceita `circle`. */}
        <path data-traco d="M50 5 A45 45 0 0 1 50 95 A45 45 0 0 1 50 5" />
        <path data-traco d="M35 21 L50 46 L65 21" />
        <path data-traco d="M18 29 L35 79 L50 56 L65 79 L82 29" />
      </svg>

      <span
        aria-hidden
        className={`h-6 w-px shrink-0 ${claro ? "bg-ink-0/30" : "bg-ink-300"}`}
      />

      {/*
       * A entrada da Uber é a animação de CSS da casa, e não mais um `animate`
       * do anime.js com atraso.
       *
       * O anime só aplica o valor inicial quando o atraso termina — até lá o
       * elemento fica com o que o CSS disser, que era opacidade cheia. O logo
       * aparecia no primeiro quadro, sumia aos 620ms quando a animação
       * finalmente começava do zero, e voltava. Piscava.
       *
       * `.entra` tem `animation-fill-mode: both`, e é isso que resolve: o
       * estado inicial vale durante o atraso, então o logo nasce escondido e só
       * aparece uma vez. De quebra continua funcionando sem JS, coisa que a
       * versão com anime não fazia.
       */}
      <span className="entra inline-flex" style={{ animationDelay: "620ms" }}>
        <LogoUber
          decorativo
          className={`h-[0.9rem] w-auto shrink-0 ${claro ? "text-ink-0" : "text-ink-900"}`}
        />
      </span>
    </Link>
  );
}
