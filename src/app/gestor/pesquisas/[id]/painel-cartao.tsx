"use client";

import { Badge } from "@/components/ui";
import { Apresentacao, Bloco, BlocoPergunta, Hook, PERGUNTA_DA_CAPA_PADRAO } from "@/lib/types";
import { Problema } from "@/lib/validacao-pesquisa";
import { useEffect, useRef } from "react";
import { EditorBloco } from "./editor-bloco";

/**
 * O que o cartão da capa faz — o sub-nó da capa.
 *
 * Existe separado porque são duas decisões diferentes: a capa é a cena (o
 * fundo), e o cartão é a porta. E porque a porta tem conteúdo próprio — o que
 * se pergunta, em que formato, com qual identificador —, que num painel só
 * ficaria pendurado embaixo de uma galeria de fundos.
 *
 * A pergunta é editada pelo mesmo `EditorBloco` das perguntas do fluxo. Nada
 * aqui presume CPF: o cartão pode pedir e-mail, telefone, um código de convite
 * ou uma matrícula, e o que muda é o formato escolhido no próprio editor.
 */
export function PainelCartao({
  apresentacao,
  blocos,
  hooks,
  podeEditar,
  onPatch,
  onFechar,
}: {
  apresentacao: Apresentacao;
  /** Só para o editor montar o catálogo de fatos já disponíveis. */
  blocos: Bloco[];
  hooks: Hook[];
  podeEditar: boolean;
  onPatch: (patch: Partial<Apresentacao>) => void;
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
    document.addEventListener("mousedown", aoApontar, true);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.removeEventListener("mousedown", aoApontar, true);
    };
  }, [onFechar]);

  const pergunta: BlocoPergunta = apresentacao.pergunta ?? PERGUNTA_DA_CAPA_PADRAO;
  const convida = apresentacao.entrada === "convite";
  const rotulo = "block text-[11px] font-semibold text-ink-700 mb-1.5";

  return (
    <div
      ref={caixa}
      className="bg-ink-0 border hairline-strong rounded-ferramenta flex flex-col max-h-full overflow-hidden"
    >
      <div className="px-4 h-11 border-b hairline flex items-center gap-2 shrink-0">
        <Badge tone="neutral">cartão</Badge>
        <span className="text-[13px] font-semibold truncate flex-1">
          {convida ? "Começa com um botão" : "Pede uma informação"}
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

      <div className="escala-ferramenta px-4 py-4 overflow-y-auto min-h-0 space-y-5">
        <div className="space-y-2">
          <Escolha
            nome="Pede uma informação"
            descricao="A resposta chega pronta na jornada."
            marcada={!convida}
            desabilitada={!podeEditar}
            onEscolher={() => onPatch({ entrada: "pergunta", pergunta })}
          />
          <Escolha
            nome="Só convida"
            descricao="Um botão. Tudo é perguntado lá dentro."
            marcada={convida}
            desabilitada={!podeEditar}
            onEscolher={() => onPatch({ entrada: "convite" })}
          />
        </div>

        {convida ? (
          <div className="border-t hairline pt-4">
            <label className={rotulo} htmlFor="capa-rotulo">
              Texto do botão
            </label>
            <input
              id="capa-rotulo"
              value={apresentacao.rotuloDoConvite ?? ""}
              disabled={!podeEditar}
              placeholder="Começar"
              onChange={(e) => onPatch({ rotuloDoConvite: e.target.value })}
              className="w-full border hairline-strong rounded-md px-2.5 h-9 text-[13px] bg-ink-0
                         outline outline-2 outline-offset-1 outline-transparent focus:outline-vw-blue"
            />
          </div>
        ) : (
          <div className="border-t hairline pt-4">
            {/*
             * O mesmo editor das perguntas do fluxo.
             *
             * Não é economia de código: é o que garante que os formatos sejam os
             * mesmos e que o identificador se comporte igual. Uma segunda tela de
             * "pergunta" divergiria da primeira no primeiro tipo novo.
             */}
            <EditorBloco
              bloco={pergunta}
              todosOsBlocos={blocos}
              hooks={hooks}
              problemas={problemasDaCapa(pergunta)}
              onPatch={(patch) =>
                onPatch({ pergunta: { ...pergunta, ...patch } as BlocoPergunta })
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * O que impede a pergunta do cartão de funcionar.
 *
 * Enunciado e identificador válido — o que `validarPesquisa` cobra das
 * perguntas do fluxo, checado aqui porque a pergunta da capa não está na árvore
 * e não passa por lá. Enquanto qualquer um faltar, a capa cai para convite na
 * hora de exibir; o aviso é o que evita descobrir isso só abrindo a tela do
 * respondente.
 *
 * O que **não** é problema: repetir o identificador de uma pergunta do fluxo.
 * É justamente assim que a capa adianta uma pergunta — a resposta entra com o
 * mesmo nome e o bloco correspondente já nasce respondido. É o que a pesquisa
 * do piloto faz: o cartão colhe `cpf`, e o "Confirme seu CPF" lá dentro sai do
 * caminho sozinho.
 */
function problemasDaCapa(pergunta: BlocoPergunta): Problema[] {
  const problemas: Problema[] = [];
  const campo = pergunta.campo.trim();

  if (!pergunta.rotulo.trim()) {
    problemas.push({ blocoId: null, gravidade: "erro", mensagem: "Escreva o enunciado." });
  }
  if (!campo) {
    problemas.push({ blocoId: null, gravidade: "erro", mensagem: "Dê um identificador." });
  } else if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(campo)) {
    problemas.push({
      blocoId: null,
      gravidade: "erro",
      mensagem: "O identificador começa com letra e usa só letras, números e _.",
    });
  }

  return problemas;
}

function Escolha({
  nome,
  descricao,
  marcada,
  desabilitada,
  onEscolher,
}: {
  nome: string;
  descricao: string;
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
      className={`w-full text-left px-3 py-2.5 rounded-md border transition
                  flex items-start gap-3 disabled:opacity-40
                  outline outline-2 outline-offset-2 outline-transparent focus-visible:outline-vw-blue ${
                    marcada
                      ? "border-vw-deep bg-ink-100"
                      : "hairline bg-ink-100 hover:bg-ink-200 hover:border-ink-500"
                  }`}
    >
      <span
        aria-hidden
        className={`mt-1 w-3.5 h-3.5 shrink-0 rounded-full border ${
          marcada ? "border-vw-deep bg-vw-deep" : "border-ink-400"
        }`}
      />
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold leading-[1.3]">{nome}</span>
        <span className="block text-[12px] text-ink-600 leading-[1.4] mt-0.5">{descricao}</span>
      </span>
    </button>
  );
}
