"use client";

import { animate } from "animejs";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * Cortina de transição de rota.
 *
 * Vive na área do respondente e na consulta do vendedor: os dois têm um momento
 * em que se digita um CPF e se espera um veredito, e é esse momento que ela
 * cobre. As telas de trabalho do gestor ficam de fora — quem alterna entre elas
 * dezenas de vezes por dia não quer uma cena a cada clique.
 *
 * O truque está em onde ela mora: no **layout**, não na página. No App Router o
 * layout não desmonta ao navegar entre rotas filhas — só o miolo troca. Então a
 * cortina atravessa a navegação, cobre a troca inteira, e a pessoa nunca vê a
 * tela vazia entre uma página e outra.
 *
 * Foi assim que deu certo depois que a `@14islands/react-page-transitions` não
 * funcionou: ela precisa manter a página que sai montada, coisa que o App Router
 * não permite. Cobrir a troca resolve o mesmo problema sem depender disso.
 */

const DUR_COBRIR = 300;
const DUR_REVELAR = 380;

const Contexto = createContext<{ irPara: (destino: string) => void } | null>(null);

export function useTransicao() {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("useTransicao precisa estar dentro de Transicao");
  return ctx;
}

export function Transicao({ children }: { children: ReactNode }) {
  const router = useRouter();
  const caminho = usePathname();
  const cortina = useRef<HTMLDivElement>(null);
  const [cobrindo, setCobrindo] = useState(false);
  /** Caminho em que a cortina foi levantada; serve para saber que já trocou. */
  const origem = useRef<string | null>(null);

  const irPara = useCallback(
    (destino: string) => {
      const alvo = cortina.current;
      const semMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (!alvo || semMovimento) {
        router.push(destino);
        return;
      }

      origem.current = caminho;
      setCobrindo(true);

      // A navegação não pode depender da animação terminar: o anime.js avança
      // por `requestAnimationFrame`, estrangulado em aba de fundo. O que vier
      // primeiro vale.
      let navegou = false;
      const ir = () => {
        if (navegou) return;
        navegou = true;
        router.push(destino);
      };

      animate(alvo, {
        opacity: [0, 1],
        duration: DUR_COBRIR,
        ease: "outQuad",
        onComplete: ir,
      });
      setTimeout(ir, DUR_COBRIR + 150);
    },
    [caminho, router],
  );

  // Trocou de rota com a cortina levantada: revela a tela nova por baixo dela.
  useEffect(() => {
    if (!cobrindo || origem.current === null || caminho === origem.current) return;

    const alvo = cortina.current;
    origem.current = null;

    if (!alvo) {
      setCobrindo(false);
      return;
    }

    let baixou = false;
    const baixar = () => {
      if (baixou) return;
      baixou = true;
      setCobrindo(false);
    };

    animate(alvo, {
      opacity: [1, 0],
      duration: DUR_REVELAR,
      ease: "outQuad",
      onComplete: baixar,
    });
    const t = setTimeout(baixar, DUR_REVELAR + 150);
    return () => clearTimeout(t);
  }, [caminho, cobrindo]);

  return (
    <Contexto.Provider value={{ irPara }}>
      {children}
      {/*
       * `pointer-events-none` sempre: a cortina cobre a vista, nunca o clique.
       * Fora da transição ela sai do fluxo por completo, para não ficar um
       * elemento de tela inteira pairando sobre o produto.
       */}
      <div
        ref={cortina}
        aria-hidden
        className={`fixed inset-0 z-50 bg-profundo pointer-events-none ${cobrindo ? "" : "hidden"}`}
        style={{ opacity: 0 }}
      />
    </Contexto.Provider>
  );
}
