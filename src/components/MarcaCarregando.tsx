"use client";

import { animate, stagger, svg } from "animejs";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** Dissolução da entrada para a primeira pergunta. */
const DUR_DISSOLVER = 420;

/**
 * Piso de exibição da marca, para quem só precisa de "um ciclo inteiro".
 *
 * O símbolo desenha e recolhe em 2000ms. Menos que isso e a marca aparece pela
 * metade, o que lê como travamento em vez de espera. Mora aqui porque é a
 * duração da animação que manda no número, e a animação é deste módulo.
 */
export const PISO_MARCA = 2000;

/**
 * Momento de entrada da jornada: o símbolo se desenhando enquanto os dados são
 * buscados, com a mensagem que o autor do hook escreveu.
 *
 * É camada fixa por cima da tela, e não conteúdo no fluxo: a primeira pergunta
 * monta por baixo enquanto a marca ainda está em cena, e por isso a passagem
 * entre as duas é uma dissolução e não um corte.
 *
 * O traço é animado pelo `svg.createDrawable` do anime.js, pela propriedade
 * `draw` — dois valores de 0 a 1 marcando início e fim do trecho visível.
 * `['0 0', '0 1', '1 1']` desenha da ponta e recolhe pela mesma ponta, o que dá
 * laço contínuo sem corte.
 *
 * O anel virou `path` de dois arcos: `createDrawable` aceita `line`, `path`,
 * `polyline` e `rect`, e não `circle`. A geometria é a mesma — centro em 50,50
 * e raio 45.
 *
 * A mensagem é `aria-live`: quem usa leitor de tela precisa saber que a espera
 * é espera, e não travamento.
 */
export function MarcaCarregando({
  mensagem,
  saindo = false,
  aoSair,
}: {
  mensagem: string;
  /** Liga a dissolução. Quem monta decide quando a espera acabou. */
  saindo?: boolean;
  /** Chamado quando a dissolução termina, para quem monta poder desmontar. */
  aoSair?: () => void;
}) {
  const raiz = useRef<HTMLDivElement>(null);
  const marca = useRef<SVGSVGElement>(null);
  const [pronto, setPronto] = useState(false);

  /**
   * A camada é portada para o `body`, e não renderizada onde foi chamada.
   *
   * `position: fixed` mede a partir da viewport — exceto quando algum ancestral
   * tem `transform`, `filter` ou `will-change`: aí ele vira o bloco de contenção
   * e o `inset-0` passa a medir a partir dele. Foi o que aconteceu quando o
   * "Finalizar" nasceu dentro do bloco que carrega a animação de entrada do
   * passo: a camada de tela cheia virou um retângulo do tamanho do conteúdo.
   *
   * No Chrome não adianta a animação já ter acabado. Com `fill: both` ela segue
   * aplicando o valor final, e o elemento continua promovido a camada composta
   * mesmo com o valor sendo `transform: none`.
   *
   * Sair da árvore resolve de uma vez, em vez de exigir que cada tela que use a
   * camada saiba em que ponto do DOM pode montá-la.
   */
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  useEffect(() => {
    const el = marca.current;
    // Na primeira passada o portal ainda não existe e a ref é nula; o efeito
    // roda de novo quando `montado` vira true, e é aí que a marca é animada.
    if (!el) return;

    const tracos = Array.from(el.querySelectorAll<SVGPathElement>("[data-traco]"));

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPronto(true);
      return;
    }

    const animacao = animate(svg.createDrawable(tracos), {
      draw: ["0 0", "0 1", "1 1"],
      ease: "inOutQuad",
      // 2000ms de ciclo: ~1s desenhando, ~1s recolhendo. Com o escalonamento, a
      // última forma fecha em 2280ms — é essa a conta do piso da jornada.
      duration: 2000,
      delay: stagger(140),
      loop: true,
    });
    setPronto(true);

    return () => {
      animacao.revert();
    };
  }, [montado]);

  useEffect(() => {
    if (!saindo) return;
    const el = raiz.current;

    // Rede de segurança: o anime.js avança por `requestAnimationFrame`, e rAF é
    // estrangulado em aba de fundo. Sem isso a camada ficaria por cima da
    // pergunta para sempre.
    let terminou = false;
    const terminar = () => {
      if (terminou) return;
      terminou = true;
      aoSair?.();
    };

    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      terminar();
      return;
    }

    animate(el, {
      opacity: [1, 0],
      duration: DUR_DISSOLVER,
      ease: "outQuad",
      onComplete: terminar,
    });
    const t = setTimeout(terminar, DUR_DISSOLVER + 150);
    return () => clearTimeout(t);
  }, [saindo, aoSair, montado]);

  if (!montado) return null;

  return createPortal(
    /*
     * `bg-profundo`, a mesma cor da cortina de transição. É o que torna a troca
     * de rota invisível: a cortina sobe navy, a jornada monta navy por baixo, e
     * quando a cortina baixa não há mudança de cor para a vista registrar.
     *
     * A camada **captura** o clique enquanto a espera dura: a pergunta já está
     * montada por baixo e invisível, e sem isso daria para respondê-la às cegas.
     * Na dissolução ela solta o clique, porque aí a pergunta já está aparecendo
     * e bloquear viraria atraso sem motivo.
     */
    <div
      ref={raiz}
      className={`fixed inset-0 z-40 bg-profundo flex flex-col items-center justify-center text-center px-6 ${
        saindo ? "pointer-events-none" : ""
      }`}
    >
      <svg
        ref={marca}
        viewBox="0 0 100 100"
        aria-hidden
        className={`w-24 h-24 text-ink-0 transition-opacity duration-150 ${pronto ? "opacity-100" : "opacity-0"}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={5}
        strokeLinejoin="miter"
        strokeMiterlimit={3}
      >
        {/* Anel: dois semiarcos no lugar do `circle`, começando pelo topo. */}
        <path data-traco d="M50 5 A45 45 0 0 1 50 95 A45 45 0 0 1 50 5" />
        <path data-traco d="M35 21 L50 46 L65 21" />
        <path data-traco d="M18 29 L35 79 L50 56 L65 79 L82 29" />
      </svg>

      <p role="status" aria-live="polite" className="text-base text-azul-100 mt-10">
        {mensagem}
      </p>
    </div>,
    document.body,
  );
}
