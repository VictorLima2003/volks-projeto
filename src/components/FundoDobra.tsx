"use client";

import { useEffect, useState } from "react";
import GradientBlinds from "./GradientBlinds";

/**
 * Fundo animado da dobra do respondente: as persianas de gradiente do reactbits,
 * com a nossa escala azul em vez da paleta de exemplo.
 *
 * Fica **por cima** do `bg-profundo`, e não no lugar dele. Se o WebGL não
 * inicializar — GPU bloqueada, contexto esgotado, navegador antigo — o gradiente
 * CSS continua atrás e a dobra segue legível. Fundo de hero não pode depender de
 * placa de vídeo.
 *
 * Só monta depois do primeiro quadro no cliente: renderizar canvas WebGL no
 * servidor não existe, e montar antes só produziria um retângulo vazio no HTML.
 */
export function FundoDobra({ holofoteFixo = false }: { holofoteFixo?: boolean }) {
  const [ligado, setLigado] = useState(false);
  const [pausado, setPausado] = useState(false);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    setPausado(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setLigado(true);
  }, []);

  /**
   * As persianas entram em transição, não de uma vez.
   *
   * O canvas monta vazio e só tem imagem um ou dois quadros depois. Aparecendo
   * já em `opacity-70`, o que se via era o gradiente CSS por um instante e as
   * persianas surgindo por cima — a tela piscava de um fundo para o outro. A
   * transição faz as duas camadas se fundirem, e quem chega vê uma coisa só.
   *
   * O `setTimeout` é rede de segurança: `requestAnimationFrame` é estrangulado
   * em aba de fundo, e sem ele quem abrisse a página em segundo plano voltaria
   * para um fundo invisível para sempre.
   */
  useEffect(() => {
    if (!ligado) return;
    let quadros = 0;
    let raf = 0;
    const passo = () => {
      quadros += 1;
      if (quadros >= 2) setVisivel(true);
      else raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    const t = setTimeout(() => setVisivel(true), 400);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [ligado]);

  if (!ligado) return null;

  return (
    <div
      aria-hidden
      className={`absolute inset-0 pointer-events-none transition-opacity duration-700 motion-reduce:transition-none ${
        visivel ? "opacity-70" : "opacity-0"
      }`}
    >
      <GradientBlinds
        /* Degraus da nossa escala azul: 900 (marca), 700, 600 (interativo), 400. */
        gradientColors={["#001E50", "#12449D", "#1B57C4", "#628CD7"]}
        angle={18}
        noise={0.12}
        blindCount={14}
        blindMinWidth={70}
        /* O holofote segue o cursor com um atraso curto — é o que dá a
           sensação de peso. Muito mais que isto e ele parece preso; menos, e
           gruda no ponteiro feito lanterna. */
        /* Na miniatura o holofote fica parado à esquerda, na altura do título —
           é onde ele estaria com alguém lendo a tela. Sem isso a peça só acende
           quando o cursor passa por cima dela. */
        spotlightFixed={holofoteFixo ? [0.34, 0.55] : undefined}
        mouseDampening={0.18}
        spotlightRadius={0.5}
        spotlightSoftness={1}
        spotlightOpacity={0.85}
        mixBlendMode="lighten"
        paused={pausado}
      />
    </div>
  );
}
