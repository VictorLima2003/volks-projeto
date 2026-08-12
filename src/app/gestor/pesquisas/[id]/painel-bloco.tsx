"use client";

import { Badge } from "@/components/ui";
import { useEffect, useRef } from "react";
import { type DestinoFluxo } from "@/lib/fluxo";
import { Bloco, ehCondicional, ehConsulta, ehFeedback, Hook } from "@/lib/types";
import { Problema } from "@/lib/validacao-pesquisa";
import { EditorBloco } from "./editor-bloco";

export type TipoNovo = "pergunta" | "condicional" | "consulta" | "feedback";

/**
 * O inspetor do bloco selecionado, flutuando sobre o canvas.
 *
 * Escala de ferramenta, não de página: o texto é menor e os espaços são mais
 * apertados que no resto do sistema. Aqui a pessoa fica horas, e cada píxel de
 * cromo é píxel que o fluxo não ocupa.
 */
export function PainelBloco({
  bloco,
  blocos,
  hooks,
  problemas,
  podeEditar,
  onPatch,
  onRemover,
  onFechar,
  onAdicionarEm,
}: {
  bloco: Bloco;
  blocos: Bloco[];
  hooks: Hook[];
  problemas: Problema[];
  podeEditar: boolean;
  onPatch: (patch: Partial<Bloco>) => void;
  onRemover: () => void;
  onFechar: () => void;
  /** Abre a escolha de tipo para este ramo, no mesmo painel. */
  onAdicionarEm: (destino: DestinoFluxo, evento: React.MouseEvent<HTMLElement>) => void;
}) {
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    };

    /*
     * Clicar fora fecha, como no popover de tipos.
     *
     * O ✕ continua no cabeçalho — não é um ou outro: o botão é o caminho
     * explícito, o clique fora é o reflexo de quem já voltou a olhar o desenho.
     *
     * Clicar em outro bloco também passa por aqui: fecha primeiro e a seleção
     * nova entra logo depois, no `click` do nó.
     */
    const aoApontar = (e: MouseEvent) => {
      const alvo = e.target as HTMLElement | null;
      if (!alvo || caixa.current?.contains(alvo)) return;
      if (alvo.closest("[data-abre-tipos]")) return;
      onFechar();
    };

    document.addEventListener("keydown", aoTeclar);
    /*
     * Fase de captura, não de bolha.
     *
     * O React Flow usa d3-drag no fundo do canvas, e o d3 chama
     * `stopImmediatePropagation` no `mousedown` para iniciar o pan. Escutando na
     * bolha, o clique no vazio morria ali e o painel nunca era avisado — a tela
     * ficava com o popover aberto e nenhum jeito de fechar a não ser o Esc.
     */
    document.addEventListener("mousedown", aoApontar, true);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.removeEventListener("mousedown", aoApontar, true);
    };
  }, [onFechar]);

  return (
    <div
      ref={caixa}
      className="bg-ink-0 border hairline-strong rounded-ferramenta flex flex-col max-h-full overflow-hidden"
    >
      <div className="px-4 h-11 border-b hairline flex items-center gap-2 shrink-0">
        <SeloDoTipo bloco={bloco} />
        <span className="text-[13px] font-semibold truncate flex-1">
          {(ehFeedback(bloco) ? bloco.titulo : bloco.rotulo) || "(sem título)"}
        </span>
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar painel"
          className="w-7 h-7 shrink-0 rounded-md text-ink-600 hover:bg-ink-100 hover:text-ink-900 transition"
        >
          ✕
        </button>
      </div>

      {/* `min-h-0`: sem isso o corpo se recusa a encolher abaixo do conteúdo e a
          rolagem nunca começa — ele estoura o teto do painel. */}
      <div className="escala-ferramenta px-4 py-4 overflow-y-auto min-h-0">
        <EditorBloco
          bloco={bloco}
          todosOsBlocos={blocos}
          hooks={hooks}
          problemas={problemas}
          onPatch={onPatch}
        />
      </div>

      {ehCondicional(bloco) && (
        <div className="px-4 py-3 border-t hairline shrink-0 flex flex-wrap gap-1.5">
          {(["entao", "senao"] as const).map((ramo) => (
            <button
              key={ramo}
              type="button"
              disabled={!podeEditar}
              data-abre-tipos
              onClick={(e) => onAdicionarEm({ condicionalId: bloco.id, ramo }, e)}
              className="h-8 px-3 rounded-full border hairline-strong text-[12px] font-medium
                         hover:border-vw-deep hover:text-vw-deep transition disabled:opacity-40
                         outline outline-2 outline-offset-2 outline-transparent focus-visible:outline-vw-blue"
            >
              + Bloco no {ramo === "entao" ? "então" : "senão"}
            </button>
          ))}
        </div>
      )}

      {/* Botão, não link: apagar é ação destrutiva e precisa de alvo com borda
          — um texto sublinhado no rodapé se clica sem querer. */}
      <div className="px-4 py-3 border-t hairline shrink-0">
        <button
          type="button"
          onClick={onRemover}
          disabled={!podeEditar}
          className="h-9 px-3.5 rounded-full border border-signal-stop/45 text-signal-stop
                     text-[13px] font-semibold hover:bg-signal-stop/[0.07] transition
                     disabled:opacity-40
                     outline outline-2 outline-offset-2 outline-transparent focus-visible:outline-vw-blue"
        >
          Remover este bloco
        </button>
      </div>
    </div>
  );
}

/** O papel do bloco. O identificador da resposta vive no editor, não aqui. */
export function SeloDoTipo({ bloco }: { bloco: Bloco }) {
  if (ehCondicional(bloco)) return <Badge tone="vw">se</Badge>;
  if (ehConsulta(bloco)) return <Badge tone="warn">busca</Badge>;
  if (ehFeedback(bloco)) {
    return (
      <Badge
        tone={
          bloco.tipo === "error" ? "stop"
          : bloco.tipo === "warning" ? "warn"
          : bloco.tipo === "sucesso" ? "go"
          : "vw"
        }
      >
        fim
      </Badge>
    );
  }
  return <Badge tone="neutral">pergunta</Badge>;
}
