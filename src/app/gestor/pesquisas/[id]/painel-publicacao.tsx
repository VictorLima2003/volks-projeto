"use client";

import { BotaoCopiar } from "@/components/BotaoCopiar";
import { Badge } from "@/components/ui";
import { PesquisaStatus } from "@/lib/types";
import { useEffect, useRef, useState } from "react";

/**
 * O que acontece depois de publicar: o endereço para compartilhar.
 *
 * Publicar sem entregar o link é meio caminho — era o que existia antes, quando
 * "publicar" queria dizer trocar uma situação num popover e depois descobrir o
 * endereço abrindo a jornada e copiando da barra do navegador.
 *
 * As duas maneiras de sair do ar também moram aqui, e não no cartão do nome:
 * situação é consequência de publicar, e ficava longe da ação que a muda —
 * quem publicasse por aqui e salvasse o cartão depois desfazia sem perceber.
 */
export function PainelPublicacao({
  pesquisaId,
  status,
  podeEditar,
  onMudarStatus,
  onFechar,
}: {
  pesquisaId: string;
  status: PesquisaStatus;
  podeEditar: boolean;
  onMudarStatus: (novo: PesquisaStatus) => void;
  onFechar: () => void;
}) {
  const caixa = useRef<HTMLDivElement>(null);

  /* O endereço só existe no navegador. Montado no efeito, o servidor e o
     primeiro render do cliente dizem a mesma coisa e a hidratação não briga. */
  const [origem, setOrigem] = useState("");
  useEffect(() => setOrigem(window.location.origin), []);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    };
    const aoApontar = (e: MouseEvent) => {
      const alvo = e.target as HTMLElement | null;
      if (!alvo || caixa.current?.contains(alvo)) return;
      if (alvo.closest("[data-abre-publicacao]")) return;
      onFechar();
    };
    document.addEventListener("keydown", aoTeclar);
    document.addEventListener("mousedown", aoApontar, true);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.removeEventListener("mousedown", aoApontar, true);
    };
  }, [onFechar]);

  const caminho = `/motorista?pesquisa=${pesquisaId}`;
  const link = origem ? `${origem}${caminho}` : caminho;

  return (
    <div
      ref={caixa}
      className="absolute top-full right-0 mt-2 z-50 w-[26rem] bg-ink-0 border hairline-strong
                 rounded-ferramenta p-4 painel-entra"
    >
      <div className="flex items-center gap-2 mb-3">
        <Badge tone={status === "ativa" ? "go" : "neutral"}>
          {status === "ativa" ? "no ar" : status}
        </Badge>
        <span className="text-[13px] font-semibold">
          {status === "ativa" ? "Quem tiver este link responde" : "Fora do ar"}
        </span>
      </div>

      {status === "ativa" ? (
        <>
          {/*
           * O link inteiro, visível e selecionável — não um "copiar" cego.
           * Quem vai colar num e-mail quer conferir o endereço antes, e quando
           * a área de transferência é negada pela política da máquina é este
           * texto que a pessoa seleciona à mão.
           */}
          <div
            id="link-da-pesquisa"
            className="text-[13px] break-all border hairline rounded-md bg-ink-100 px-3 py-2.5 leading-snug"
          >
            {link}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <BotaoCopiar valor={link} alvoId="link-da-pesquisa" compacto />
            <a
              href={caminho}
              target="_blank"
              rel="noreferrer"
              className="h-9 px-3.5 inline-flex items-center rounded-full border hairline-strong
                         text-[13px] font-semibold hover:border-vw-deep hover:text-vw-deep transition"
            >
              Abrir
            </a>
          </div>

          <div className="mt-4 pt-3 border-t hairline flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!podeEditar}
              onClick={() => onMudarStatus("pausada")}
              className="h-9 px-3.5 rounded-full border hairline-strong text-[13px] font-medium
                         hover:border-vw-deep hover:text-vw-deep transition disabled:opacity-40"
            >
              Tirar do ar
            </button>
            <button
              type="button"
              disabled={!podeEditar}
              onClick={() => onMudarStatus("encerrada")}
              className="h-9 px-3.5 rounded-full border border-signal-stop/45 text-signal-stop
                         text-[13px] font-medium hover:bg-signal-stop/[0.07] transition disabled:opacity-40"
            >
              Encerrar
            </button>
          </div>
          {/* A diferença entre as duas não é óbvia pelo nome, e uma delas é a
              que não se desfaz sem republicar. */}
          <p className="mt-2 text-[12px] text-ink-600 leading-snug">
            Tirar do ar pausa e dá para publicar de novo. Encerrar é o fim da coleta — o link
            passa a dizer que a pesquisa terminou.
          </p>
        </>
      ) : (
        <p className="text-[13px] text-ink-700 leading-snug">
          Quem abrir o link vê um aviso de que a pesquisa não está recebendo respostas. Publique
          para o link voltar a funcionar.
        </p>
      )}
    </div>
  );
}
