"use client";

import { FUNDOS, FundoDaCapa as CamadaDeFundo } from "@/components/FundoDaCapa";
import { Badge } from "@/components/ui";
import { Apresentacao, FundoDaCapa, LIMITE_DO_TITULO } from "@/lib/types";
import { useEffect, useRef, useState } from "react";

/**
 * O inspetor da capa — a tela que quem responde vê antes da primeira pergunta.
 *
 * Mora aqui, no fluxo, e não na configuração da pesquisa: a capa é o começo do
 * percurso, e o percurso é isto que está desenhado. Nome, chamada e situação
 * continuam no cartão da marca, porque são identidade, não caminho.
 *
 * O que o cartão faz tem painel próprio, no sub-nó — ali cabem o formato da
 * pergunta e o identificador dela, que aqui virariam um segundo assunto.
 */
export function PainelCapa({
  apresentacao,
  texto,
  podeEditar,
  onPatch,
  onPatchTexto,
  onFechar,
}: {
  apresentacao: Apresentacao;
  /** O que a capa escreve: o título grande e o parágrafo abaixo dele. */
  texto: { chamada: string; descricao: string };
  podeEditar: boolean;
  onPatch: (patch: Partial<Apresentacao>) => void;
  onPatchTexto: (patch: { chamada?: string; descricao?: string }) => void;
  onFechar: () => void;
}) {
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    };
    const aoApontar = (e: MouseEvent) => {
      const alvo = e.target as HTMLElement | null;
      if (!alvo || caixa.current?.contains(alvo)) return;
      if (alvo.closest("[data-abre-tipos]")) return;
      onFechar();
    };
    document.addEventListener("keydown", aoTeclar);
    /* Captura, não bolha: o d3-drag do canvas interrompe a propagação do
       `mousedown` para começar o pan. Ver o mesmo comentário no inspetor. */
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
        <Badge tone="vw">capa</Badge>
        <span className="text-[13px] font-semibold truncate flex-1">Tela de entrada</span>
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar painel"
          className="w-7 h-7 shrink-0 rounded-md text-ink-600 hover:bg-ink-100 hover:text-ink-900 transition"
        >
          ✕
        </button>
      </div>

      <div className="escala-ferramenta px-5 py-5 overflow-y-auto min-h-0">
        {/*
         * O texto da capa vem antes do fundo, porque é o que a pessoa lê.
         *
         * Os dois campos moravam na configuração da pesquisa, junto do nome
         * interno e da situação. Estavam no lugar errado: são o título e o
         * parágrafo *desta* tela, e escrevê-los longe dela obrigava a decorar o
         * efeito. No cartão da marca ficou o que é identidade — nome e situação.
         */}
        <div className="space-y-3 mb-5 pb-5 border-b hairline">
          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <label className="block text-[11px] font-semibold text-ink-700" htmlFor="capa-chamada">
                Título
              </label>
              {/*
               * A contagem só aparece perto do fim.
               *
               * Visível desde a primeira letra, ela vira um cronômetro em cima
               * de quem escreve; guardada até faltar pouco, ela chega quando
               * vira informação — e o campo já não deixa passar do teto.
               */}
              {texto.chamada.length > LIMITE_DO_TITULO * 0.8 && (
                <span
                  className={`text-[11px] tabular-nums ${
                    texto.chamada.length >= LIMITE_DO_TITULO ? "text-signal-stop" : "text-ink-600"
                  }`}
                >
                  {texto.chamada.length}/{LIMITE_DO_TITULO}
                </span>
              )}
            </div>
            <input
              id="capa-chamada"
              value={texto.chamada}
              disabled={!podeEditar}
              maxLength={LIMITE_DO_TITULO}
              placeholder="O que quem responde lê primeiro"
              onChange={(e) => onPatchTexto({ chamada: e.target.value })}
              className="w-full border hairline-strong rounded-md px-2.5 h-9 text-[13px] bg-ink-0
                         outline outline-2 outline-offset-1 outline-transparent focus:outline-vw-blue"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-ink-700 mb-1.5" htmlFor="capa-descricao">
              Descrição
            </label>
            {/* Área de texto, não campo de uma linha: são duas ou três frases, e
                num campo raso a pessoa escreve às cegas a partir da segunda. */}
            <textarea
              id="capa-descricao"
              value={texto.descricao}
              disabled={!podeEditar}
              rows={3}
              placeholder="O parágrafo abaixo do título."
              onChange={(e) => onPatchTexto({ descricao: e.target.value })}
              className="w-full border hairline-strong rounded-md px-2.5 py-2 text-[13px] bg-ink-0 leading-[1.45]
                         outline outline-2 outline-offset-1 outline-transparent focus:outline-vw-blue"
            />
            <p className="mt-1.5 text-[12px] text-ink-600 leading-[1.4]">
              Também é o resumo da pesquisa na lista do gestor.
            </p>
          </div>
        </div>

        <span className="block text-[11px] font-semibold text-ink-700 mb-3">Fundo</span>

        {/*
         * Prévia de verdade, com as camadas reais.
         *
         * A primeira versão era uma lista de nomes, pelo argumento de que dois
         * dos fundos só se distinguem em movimento. O argumento estava certo e a
         * conclusão errada: sem imagem nenhuma, todos ficavam indistinguíveis.
         * A miniatura desenha a mesma coisa que a página — fundo, camada
         * decorativa, um traço de título e o cartão — e o animado só liga na
         * peça em foco, para não subir vários contextos WebGL de uma vez.
         *
         * Duas colunas num painel largo, e não três num estreito: a diferença
         * entre "gradiente" e "persianas parada" mora em algumas dezenas de
         * pixels de clarão, e some numa peça de miniatura de ícone.
         */}
        <div className="grid grid-cols-2 gap-3">
          {FUNDOS.map((f) => (
            <MiniCapa
              key={f.id}
              fundo={f.id}
              nome={f.nome}
              descricao={f.descricao}
              claro={f.claro === true}
              marcada={apresentacao.fundo === f.id}
              desabilitada={!podeEditar}
              onEscolher={() => onPatch({ fundo: f.id as FundoDaCapa })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Uma capa em miniatura, na proporção da tela. */
function MiniCapa({
  fundo,
  nome,
  descricao,
  claro,
  marcada,
  desabilitada,
  onEscolher,
}: {
  fundo: string;
  nome: string;
  descricao: string;
  claro: boolean;
  marcada: boolean;
  desabilitada: boolean;
  onEscolher: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onEscolher}
      disabled={desabilitada}
      aria-pressed={marcada}
      className={`text-left rounded-md border overflow-hidden transition disabled:opacity-40
                  outline outline-2 outline-offset-2 outline-transparent focus-visible:outline-vw-blue
                  ${marcada ? "border-vw-deep" : "hairline hover:border-ink-500"}`}
    >
      <span className="block relative h-[8.5rem] bg-profundo overflow-hidden">
        {/*
         * Todas as camadas ficam montadas, inclusive a animada.
         *
         * Ela só aparecia sob o cursor, para "não subir vários contextos WebGL"
         * — e era conta errada: WebGL só existe em uma das cinco opções. Uma
         * peça que só se revela ao passar o mouse é uma peça que não se compara
         * com a do lado, que é para isso que a galeria existe.
         */}
        <CamadaDeFundo fundo={fundo as FundoDaCapa} miniatura />

        {/*
         * Título e cartão em miniatura: sem eles a peça é um retângulo colorido
         * e não se lê como a tela que representa. As barras seguem o tom do
         * fundo — numa capa clara elas são escuras, que é exatamente o que a
         * escolha muda na página.
         */}
        <span aria-hidden className="absolute left-3 top-7 flex flex-col gap-1.5">
          <span
            className={`block h-2 w-24 rounded-full ${claro ? "bg-ink-900/80" : "bg-ink-0/85"}`}
          />
          <span
            className={`block h-2 w-16 rounded-full ${claro ? "bg-ink-900/35" : "bg-ink-0/45"}`}
          />
        </span>
        <span
          aria-hidden
          className={`absolute right-3 top-6 bottom-6 w-16 rounded-[4px] bg-ink-0 ${
            claro ? "border border-[var(--line-strong)]" : ""
          }`}
        >
          {/* O cartão da capa tem um campo e um botão. Em miniatura, dois
              traços — o suficiente para ele não virar um retângulo branco. */}
          <span className="absolute left-2 right-2 top-4 h-1.5 rounded-full bg-ink-200" />
          <span className="absolute left-2 right-2 top-8 h-2.5 rounded-full bg-vw-deep" />
        </span>
      </span>

      <span className="block px-3 py-2">
        <span className="block text-[13px] font-semibold leading-tight">{nome}</span>
        <span className="block text-[12px] text-ink-600 leading-[1.4] mt-0.5">{descricao}</span>
      </span>
    </button>
  );
}
