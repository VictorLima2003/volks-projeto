"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "./ui";

/**
 * Avisos (toasts) — o feedback de tudo que **não** é validação de campo.
 *
 * A regra é essa: erro de campo mora colado ao campo, porque a correção é ali.
 * Resultado de ação — salvou, criou, aprovou, falhou ao enviar — é aviso. Antes,
 * "Pedido ped_xxx criado" aparecia como um texto verde ao lado do botão, que
 * some no meio do formulário e some de vez quando a tela rola.
 *
 * Some sozinho depois de alguns segundos, e o erro fica mais tempo que o
 * sucesso: um deu certo e a pessoa segue a vida; o outro pede leitura.
 *
 * Portal para o `body`: `position: fixed` mede a partir da viewport, exceto
 * quando um ancestral tem transform — armadilha que já custou uma sessão neste
 * projeto com a camada de carregamento.
 */

export type TomAviso = "go" | "warn" | "stop" | "neutro";

interface Aviso {
  id: number;
  mensagem: string;
  tom: TomAviso;
}

/*
 * Erro dura mais que sucesso, e atenção fica no meio: um deu certo e a pessoa
 * segue a vida; o outro pede leitura e às vezes uma decisão.
 */
const DURACAO: Record<TomAviso, number> = { go: 4000, neutro: 4000, warn: 6000, stop: 7000 };

const Contexto = createContext<{ avisar: (mensagem: string, tom?: TomAviso) => void } | null>(null);

export function useAviso() {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("useAviso precisa estar dentro de <Avisos>");
  return ctx;
}

export function Avisos({ children }: { children: ReactNode }) {
  const [lista, setLista] = useState<Aviso[]>([]);
  const [montado, setMontado] = useState(false);
  const proximoId = useRef(0);

  useEffect(() => setMontado(true), []);

  const remover = useCallback((id: number) => {
    setLista((l) => l.filter((a) => a.id !== id));
  }, []);

  const avisar = useCallback(
    (mensagem: string, tom: TomAviso = "neutro") => {
      const id = (proximoId.current += 1);
      setLista((l) => [...l, { id, mensagem, tom }]);
      setTimeout(() => remover(id), DURACAO[tom]);
    },
    [remover],
  );

  return (
    <Contexto.Provider value={{ avisar }}>
      {children}
      {montado &&
        createPortal(
          /*
           * Canto inferior direito no desktop, faixa no pé do celular. Não é o
           * topo: no topo ele cobre o cabeçalho e, no celular, disputa com a
           * barra de endereço.
           *
           * `pointer-events-none` na pilha e `auto` em cada aviso — a área vazia
           * entre eles não pode roubar clique da tela.
           */
          <div
            className="fixed z-[60] inset-x-0 bottom-0 sm:inset-x-auto sm:right-6 sm:bottom-6
                       flex flex-col-reverse gap-2 p-4 sm:p-0 sm:w-[22rem] pointer-events-none"
          >
            {lista.map((a) => (
              <ItemAviso key={a.id} aviso={a} aoFechar={() => remover(a.id)} />
            ))}
          </div>,
          document.body,
        )}
    </Contexto.Provider>
  );
}

/*
 * Cada tom tem cor **e** forma. Cor sozinha não informa — quem não distingue
 * verde de vermelho precisa do ícone, e quem lê rápido reconhece a silhueta
 * antes de ler a frase.
 *
 * O X aqui é legítimo, ao contrário do selo de "ainda não elegível": lá o
 * veredito não era final e a seta em círculo dizia "volte depois"; aqui a ação
 * falhou de fato.
 */
const ESTILO: Record<TomAviso, { caixa: string; icone: string }> = {
  go: {
    caixa: "border-signal-go/40 bg-signal-go/[0.07]",
    icone: "text-signal-go",
  },
  warn: {
    caixa: "border-signal-warn/40 bg-signal-warn/[0.08]",
    icone: "text-signal-warn",
  },
  stop: {
    caixa: "border-signal-stop/40 bg-signal-stop/[0.07]",
    icone: "text-signal-stop",
  },
  neutro: {
    caixa: "border-vw-deep/30 bg-vw-deep/[0.05]",
    icone: "text-vw-deep",
  },
};

/** Ícones à mão, no mesmo traço do resto do produto. */
function IconeAviso({ tom }: { tom: TomAviso }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn("w-5 h-5 shrink-0 mt-px", ESTILO[tom].icone)}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {tom === "go" && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M8.2 12.4l2.6 2.6L16 9.8" />
        </>
      )}
      {/* Triângulo para atenção: a silhueta é reconhecida antes da cor. */}
      {tom === "warn" && (
        <>
          <path d="M12 3.8L21.2 19.4H2.8L12 3.8z" />
          <path d="M12 9.6v4.2" />
          <path d="M12 16.6v.1" />
        </>
      )}
      {tom === "stop" && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M9 9l6 6M15 9l-6 6" />
        </>
      )}
      {tom === "neutro" && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11.2v5" />
          <path d="M12 7.8v.1" />
        </>
      )}
    </svg>
  );
}

function ItemAviso({ aviso, aoFechar }: { aviso: Aviso; aoFechar: () => void }) {
  return (
    <div
      /*
       * `alert` para erro e `status` para o resto: o leitor de tela interrompe a
       * leitura no primeiro e espera uma pausa no segundo, que é a diferença
       * entre "deu ruim" e "pronto".
       */
      role={aviso.tom === "stop" ? "alert" : "status"}
      aria-live={aviso.tom === "stop" ? "assertive" : "polite"}
      className={cn(
        "entra pointer-events-auto flex items-start gap-3 rounded-md border shadow-lift px-4 py-3.5",
        ESTILO[aviso.tom].caixa,
      )}
    >
      <IconeAviso tom={aviso.tom} />
      {/* O texto fica em `ink-900`, não na cor do tom: sobre fundo tinto, texto
          colorido perde contraste e a frase é o que precisa ser lido. */}
      <p className="flex-1 text-sm text-ink-900 leading-snug">{aviso.mensagem}</p>
      <button
        type="button"
        onClick={aoFechar}
        aria-label="Fechar aviso"
        className="shrink-0 -mr-1 -mt-1 p-1 text-ink-600 hover:text-ink-900 transition rounded-sm
                   outline outline-2 outline-offset-2 outline-transparent focus-visible:outline-vw-blue"
      >
        <svg viewBox="0 0 16 16" aria-hidden className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      </button>
    </div>
  );
}
