"use client";

import { capaEhClara, FundoDaCapa as CamadaDeFundo } from "@/components/FundoDaCapa";
import { Button, Input, Label, SetaCta } from "@/components/ui";
import { Apresentacao } from "@/lib/types";
import { useLayoutEffect, useRef, useState } from "react";

/**
 * A largura de tela que a prévia finge ter.
 *
 * A capa é desenhada **em tamanho real** nesta largura e depois reduzida por
 * `transform`. Montar o mesmo layout direto numa caixa menor — que foi a
 * primeira tentativa — dá proporções erradas: o cartão de entrada ficava com
 * 40% da largura contra 32% na tela de verdade, e o título cabia em menos
 * linhas do que caberá. O que se vê aqui tem de ser a página, só menor.
 */
const LARGURA_VIRTUAL = 1440;

/**
 * A capa como quem responde vê, dentro da simulação.
 *
 * Não é uma ilustração da capa: é a capa, com as mesmas camadas de fundo, os
 * mesmos componentes de formulário e a mesma escala tipográfica. Uma imagem
 * desenhada à parte envelheceria no primeiro ajuste da tela real, e a simulação
 * existe justamente para não ter essa diferença.
 *
 * E ela **funciona**: a resposta dada aqui entra nos fatos como entra na
 * jornada. Enquanto a simulação começava direto na primeira pergunta do fluxo,
 * o fato que a capa colhe não existia — e uma regra que dependesse dele
 * decidia diferente aqui e lá fora.
 */
export function PreviaDaCapa({
  apresentacao,
  titulo,
  descricao,
  onComecar,
}: {
  apresentacao: Apresentacao;
  titulo: string;
  descricao: string;
  /** Recebe a resposta da capa — vazia quando ela só convida. */
  onComecar: (resposta: { campo: string; valor: string } | null) => void;
}) {
  const [valor, setValor] = useState("");
  const claro = capaEhClara(apresentacao.fundo);
  const pergunta = apresentacao.pergunta;
  const convida =
    apresentacao.entrada === "convite" ||
    !pergunta?.campo.trim() ||
    !pergunta?.rotulo.trim();

  /*
   * A escala sai da medida da moldura, e não de um número fixo: a folha muda de
   * largura com a janela, e uma escala chumbada deixaria a página virtual maior
   * ou menor que o espaço disponível.
   *
   * A altura virtual é a que sobra depois de escalar — a prévia é uma janela
   * baixa do navegador, não uma tela cortada.
   */
  const moldura = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(0);
  const [alturaVirtual, setAlturaVirtual] = useState(810);

  useLayoutEffect(() => {
    const el = moldura.current;
    if (!el) return;
    const medir = () => {
      const r = el.getBoundingClientRect();
      if (!r.width) return;
      const s = r.width / LARGURA_VIRTUAL;
      setEscala(s);
      setAlturaVirtual(r.height / s);
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="rounded-md border hairline overflow-hidden">
      <div ref={moldura} className="relative bg-profundo h-[46vh] min-h-[19rem] overflow-hidden">
        {/* Até a primeira medida não há escala: desenhar em 1440 dentro de uma
            caixa de 1200 mostraria a página fora de lugar por um quadro. */}
        {escala > 0 && (
          <div
            style={{
              width: LARGURA_VIRTUAL,
              height: alturaVirtual,
              transform: `scale(${escala})`,
              transformOrigin: "top left",
            }}
            className={`relative ${claro ? "text-ink-900" : "text-ink-0"}`}
          >
            <CamadaDeFundo fundo={apresentacao.fundo} miniatura />

            {/* Daqui para baixo é a mesma estrutura de `motorista/page.tsx`:
                mesma caixa de leitura, mesmas colunas, mesmos corpos de texto.
                Sem `lg:` nas colunas — quem manda aqui é a largura virtual, e os
                pontos de quebra do Tailwind olham para a janela de verdade. */}
            <div className="relative h-full flex items-center">
              <div className="max-w-7xl mx-auto px-6 w-full grid grid-cols-12 gap-x-12 items-center">
                <div className="col-span-7">
                  {/* A cor vai explícita, como na tela real: o `h1,h2,h3 { color }`
                      do globals.css segura a regra de título nunca colorido e
                      vence a cor herdada do fundo escuro. */}
                  <h3
                    className={`display text-5xl leading-[1.05] ${
                      claro ? "text-ink-900" : "text-ink-0"
                    }`}
                  >
                    {titulo}
                  </h3>
                  {descricao && (
                    <p
                      className={`text-lg mt-8 max-w-2xl ${
                        claro ? "text-ink-700" : "text-azul-100"
                      }`}
                    >
                      {descricao}
                    </p>
                  )}
                </div>

                <div className="col-span-5">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (convida) return onComecar(null);
                      if (!valor.trim()) return;
                      onComecar({ campo: pergunta!.campo, valor: valor.trim() });
                    }}
                    className="bg-ink-0 text-ink-900 border hairline rounded-md p-8 shadow-lift"
                  >
                    {!convida && (
                      <>
                        <h4 className="text-xl font-semibold tracking-tight mb-6">
                          {pergunta!.rotulo}
                        </h4>
                        <Label
                          htmlFor="previa-entrada"
                          className={pergunta!.ajuda?.trim() ? undefined : "sr-only"}
                        >
                          {pergunta!.ajuda?.trim() || pergunta!.rotulo}
                        </Label>
                        <Input
                          id="previa-entrada"
                          value={valor}
                          autoComplete="off"
                          onChange={(e) => setValor(e.target.value)}
                        />
                      </>
                    )}
                    <Button type="submit" className={convida ? "w-full" : "mt-6 w-full"}>
                      {convida
                        ? apresentacao.rotuloDoConvite?.trim() || "Começar"
                        : "Continuar"}
                      <SetaCta />
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
