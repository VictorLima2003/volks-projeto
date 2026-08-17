"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import dagre from "@dagrejs/dagre";
import { useCallback, useMemo } from "react";

import { NoBase, NoFantasma, IconeMais } from "@/components/fluxo/NoBase";
import { Badge } from "@/components/ui";
import { montarGrafo, type NoFluxo } from "@/lib/fluxo";
import { NOME_DO_FUNDO } from "@/lib/fundos";
import { Apresentacao, Bloco, ehCondicional, ehConsulta, ehFeedback } from "@/lib/types";
import { Problema } from "@/lib/validacao-pesquisa";

/**
 * A pesquisa desenhada como fluxo.
 *
 * O canvas é uma **vista** da mesma árvore que a aba Definição edita — não um
 * segundo formato de dado. Por isso não há posição guardada: o lugar de cada
 * bloco é calculado a cada render a partir da árvore. Guardar coordenada exigiria
 * mantê-la em dia a cada bloco inserido pela outra aba, e as duas telas
 * divergiriam sem ninguém perceber.
 *
 * A consequência aceita: aqui não se reordena arrastando. Mover um bloco é
 * mexer na ordem da árvore, e isso continua na Definição. Aqui se lê o caminho,
 * se edita o conteúdo de cada bloco e se adiciona no fim de cada ramo.
 */

/* Escala de ferramenta: o nó encolheu junto com o resto do cromo. Em 260×92 —
   a medida de cartão de página — cabiam quatro blocos na altura da tela, e ler
   um fluxo é justamente ver muitos de uma vez. */
const LARGURA = 200;
const ALTURA = 66;

/* O convite de ramo é menor que um bloco, mas precisa caber "+ então". */
const CONVITE_L = 86;
const CONVITE_A = 30;

type ResumoDaCapa = Pick<Apresentacao, "fundo" | "entrada" | "pergunta" | "rotuloDoConvite">;

type DadosNo = {
  no: NoFluxo;
  temErro: boolean;
  selecionado: boolean;
};

/** Layout de cima para baixo. Dagre resolve a ordem dos ramos sem cruzar setas. */
function posicionar(nos: NoFluxo[], arestas: { de: string; para: string }[]) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 32, ranksep: 46, marginx: 24, marginy: 24 });

  for (const n of nos) {
    /* O convite de ramo é menor: reservar a caixa cheia abriria um vão do
       tamanho de um bloco no meio da linha. */
    const conviteDeRamo = n.id.startsWith("ramo:");
    g.setNode(n.id, {
      width: conviteDeRamo ? CONVITE_L : LARGURA,
      height: conviteDeRamo ? CONVITE_A : ALTURA,
    });
  }
  for (const a of arestas) g.setEdge(a.de, a.para);
  dagre.layout(g);

  return new Map(
    nos.map((n) => {
      const { x, y, width, height } = g.node(n.id);
      // Dagre devolve o centro; o React Flow quer o canto superior esquerdo.
      return [n.id, { x: x - width / 2, y: y - height / 2 }];
    }),
  );
}

/**
 * Põe o "então" à esquerda e o "senão" à direita, sem desfazer o dagre.
 *
 * A pergunta que uma condicional faz tem uma ordem na cabeça de quem lê: *tal
 * coisa? sim, então isto; senão, aquilo*. Quando o desenho invertia os lados, a
 * leitura pedia uma conferência na etiqueta a cada bifurcação, e é justamente
 * essa conferência que um fluxograma existe para poupar.
 *
 * Antes o lado era descoberto do layout e o handle é que seguia. Funcionava
 * contra cruzamento de linha, mas deixava o lado ao acaso do dagre.
 *
 * Aqui o dagre continua decidindo a ordem — ele é bom nisso, e reordenar à mão
 * traria de volta as linhas cruzadas. O que se faz depois é **espelhar** o par
 * de ramos quando vier trocado. Espelhar é reflexão: preserva a quantidade de
 * cruzamentos lá dentro e preserva a caixa que os dois ocupam, então nada
 * escorrega para cima do que está em volta.
 *
 * Só o que é **exclusivo** de cada ramo se move. Os ramos voltam a se encontrar
 * — o bloco depois do `se` é alcançável pelos dois — e mover o ponto de
 * encontro arrastaria com ele o resto da pesquisa.
 *
 * As condicionais são tratadas de cima para baixo porque espelhar um par também
 * espelha as condicionais aninhadas nele; processando o pai primeiro, o filho é
 * conferido já na posição final.
 */
function porEntaoAEsquerda(
  posicoes: Map<string, { x: number; y: number }>,
  arestas: { de: string; para: string; ramo?: "entao" | "senao" }[],
  condicionais: string[],
) {
  const saidas = new Map<string, string[]>();
  for (const a of arestas) saidas.set(a.de, [...(saidas.get(a.de) ?? []), a.para]);

  const alcance = (raiz: string) => {
    const vistos = new Set<string>();
    const fila = [raiz];
    while (fila.length) {
      const id = fila.shift()!;
      if (vistos.has(id)) continue;
      vistos.add(id);
      for (const p of saidas.get(id) ?? []) fila.push(p);
    }
    return vistos;
  };

  const largura = (id: string) => (id.startsWith("ramo:") ? CONVITE_L : LARGURA);
  const daEsquerda = (ids: Set<string>) =>
    Math.min(...[...ids].map((id) => posicoes.get(id)?.x ?? 0));

  const emOrdemDeLeitura = [...condicionais].sort(
    (a, b) => (posicoes.get(a)?.y ?? 0) - (posicoes.get(b)?.y ?? 0),
  );

  for (const id of emOrdemDeLeitura) {
    const entrada = (ramo: "entao" | "senao") =>
      arestas.find((a) => a.de === id && a.ramo === ramo)?.para;
    const eE = entrada("entao");
    const eS = entrada("senao");
    if (!eE || !eS) continue;

    const deE = alcance(eE);
    const deS = alcance(eS);
    const soE = new Set([...deE].filter((n) => !deS.has(n)));
    const soS = new Set([...deS].filter((n) => !deE.has(n)));
    if (!soE.size || !soS.size) continue;

    if (daEsquerda(soE) <= daEsquerda(soS)) continue;

    const juntos = [...soE, ...soS];
    const inicio = Math.min(...juntos.map((n) => posicoes.get(n)!.x));
    const fim = Math.max(...juntos.map((n) => posicoes.get(n)!.x + largura(n)));
    for (const n of juntos) {
      const p = posicoes.get(n)!;
      posicoes.set(n, { x: inicio + fim - (p.x + largura(n)), y: p.y });
    }
  }
}

/** O nó fantasma não existe na árvore: é a ponta onde o próximo bloco entra. */
const FANTASMA = "__proximo__";

/**
 * A capa — a tela de entrada — como primeiro nó do desenho.
 *
 * Ela também não está na árvore de blocos, e não deve estar: não é pergunta, o
 * motor não a percorre, nenhuma condição a referencia. Mas é por onde o percurso
 * começa, e esconder isso da tela obrigava a procurar a configuração da capa num
 * menu longe do caminho que ela abre.
 */
export const CAPA = "__capa__";

/**
 * O cartão da capa, pendurado nela.
 *
 * É um nó próprio e não uma linha dentro do painel da capa porque é onde o
 * percurso realmente começa a colher: ou ele pergunta alguma coisa, e a resposta
 * entra nos fatos como qualquer outra, ou ele só abre a porta. Ver isso no
 * desenho evita a pergunta "de onde veio esse `resposta.cpf` que a regra usa?".
 */
export const CARTAO = "__cartao__";

/**
 * A autorização, entre o cartão e o primeiro bloco montado.
 *
 * Como a capa e o cartão, ela não está na árvore — é etapa do sistema. Aparecer
 * no desenho é o que impede alguém de montar um fluxo inteiro sem perceber que
 * existe uma pergunta antes do que ele escreveu.
 */
export const CONSENTIMENTO = "__consentimento_no__";

/**
 * O convite de um ramo vazio, no meio da linha dele.
 *
 * Fica **sempre visível**, e não só ao passar o mouse: controle que depende de
 * hover não é descoberto por quem nunca viu a tela, e nem existe no toque. É o
 * que faz o Power Automate ("insert a new step" na seta do ramo) e o n8n (o
 * "+" na saída do nó); o Zapier resolve por outro caminho — proíbe ramo vazio —,
 * que aqui não serve: no nosso motor um ramo vazio quer dizer "segue em frente".
 */
const RAMO_VAZIO = (condicionalId: string, ramo: "entao" | "senao") =>
  `ramo:${condicionalId}:${ramo}`;

export function MapaFluxo({
  blocos,
  problemas,
  selecionado,
  capa,
  consentimento,
  onSelecionar,
  onAdicionarNoFim,
  onAdicionarNoRamo,
}: {
  blocos: Bloco[];
  problemas: Problema[];
  selecionado: string | null;
  /** Resumo da tela de entrada, para os nós dizerem o que ela é hoje. */
  capa: ResumoDaCapa;
  consentimento: { ativo: boolean; pergunta: string };
  onSelecionar: (id: string | null) => void;
  /** Clique no nó fantasma. Recebe o retângulo dele, para o popover nascer ali. */
  onAdicionarNoFim: (retangulo: DOMRect) => void;
  /** Clique no "+" de um ramo vazio. */
  onAdicionarNoRamo: (
    destino: { condicionalId: string; ramo: "entao" | "senao" },
    retangulo: DOMRect,
  ) => void;
}) {
  const grafo = useMemo(() => montarGrafo(blocos), [blocos]);

  const { nodes, edges } = useMemo(() => {
    /*
     * O fantasma entra sempre, inclusive na pesquisa vazia.
     *
     * Antes ele ficava de fora quando não havia bloco nenhum, porque o estado
     * vazio tinha um "+" próprio no meio da tela e os dois juntos eram dois
     * convites idênticos a três dedos de distância. Com a capa como primeiro nó,
     * a pesquisa vazia deixou de ser uma tela em branco: ela é capa → "+", e o
     * convite solto no meio virou repetição.
     */
    const comFantasma = true;

    /*
     * O fantasma entra no layout como um nó comum — é o que faz o dagre abrir
     * espaço para ele em vez de deixá-lo por cima do último bloco.
     */
    const arestasComFantasma = [
      ...grafo.arestas,
      /* Capa → cartão → primeiro bloco (ou o fantasma, na pesquisa vazia). É o
         que dá ao dagre a corrente para empilhar tudo. */
      { id: `${CAPA}->${CARTAO}`, de: CAPA, para: CARTAO, ramo: undefined },
      ...(consentimento.ativo
        ? [
            { id: `${CARTAO}->${CONSENTIMENTO}`, de: CARTAO, para: CONSENTIMENTO, ramo: undefined },
            {
              id: `${CONSENTIMENTO}->${grafo.nos[0]?.id ?? FANTASMA}`,
              de: CONSENTIMENTO,
              para: grafo.nos[0]?.id ?? FANTASMA,
              ramo: undefined,
            },
          ]
        : [
            {
              id: `${CARTAO}->${grafo.nos[0]?.id ?? FANTASMA}`,
              de: CARTAO,
              para: grafo.nos[0]?.id ?? FANTASMA,
              ramo: undefined,
            },
          ]),
      ...grafo.pontas.map((p) => ({
        id: `${p.de}->${FANTASMA}${p.ramo ? `:${p.ramo}` : ""}`,
        de: p.de,
        para: FANTASMA,
        ramo: p.ramo,
      })),
    ];
    /*
     * Ramo vazio ganha um nó no meio da própria linha.
     *
     * A aresta original ia direto do `se` ao bloco de baixo — que é a verdade do
     * motor. Ela continua existindo, partida em duas: o convite entra no meio do
     * caminho, sem inventar uma terceira saída.
     */
    const porId = new Map(grafo.nos.map((n) => [n.id, n.bloco]));
    const arestasFinais: typeof arestasComFantasma = [];
    const conviteDeRamo: { id: string; condicionalId: string; ramo: "entao" | "senao" }[] = [];

    for (const a of arestasComFantasma) {
      const bloco = porId.get(a.de);
      const vazio =
        a.ramo && bloco && bloco.bloco === "condicional" && bloco[a.ramo].length === 0;

      if (!vazio || !a.ramo) {
        arestasFinais.push(a);
        continue;
      }

      const id = RAMO_VAZIO(a.de, a.ramo);
      conviteDeRamo.push({ id, condicionalId: a.de, ramo: a.ramo });
      arestasFinais.push({ id: `${a.de}->${id}`, de: a.de, para: id, ramo: a.ramo });
      arestasFinais.push({ id: `${id}->${a.para}`, de: id, para: a.para });
    }

    const posicoes = posicionar(
      [
        { id: CAPA } as NoFluxo,
        { id: CARTAO } as NoFluxo,
        ...(consentimento.ativo ? [{ id: CONSENTIMENTO } as NoFluxo] : []),
        ...grafo.nos,
        ...(comFantasma ? [{ id: FANTASMA } as NoFluxo] : []),
        ...conviteDeRamo.map((c) => ({ id: c.id }) as NoFluxo),
      ],
      arestasFinais,
    );
    porEntaoAEsquerda(
      posicoes,
      arestasFinais,
      grafo.nos.filter((n) => ehCondicional(n.bloco)).map((n) => n.id),
    );

    const nodes: Node<DadosNo>[] = grafo.nos.map((no) => ({
      id: no.id,
      type: "bloco",
      position: posicoes.get(no.id) ?? { x: 0, y: 0 },
      data: {
        no,
        temErro: problemas.some((p) => p.blocoId === no.id && p.gravidade === "erro"),
        selecionado: selecionado === no.id,
      },
      draggable: false,
    }));

    nodes.push({
      id: CAPA,
      type: "capa",
      position: posicoes.get(CAPA) ?? { x: 0, y: 0 },
      data: { capa, selecionado: selecionado === CAPA } as unknown as DadosNo,
      draggable: false,
    });

    if (consentimento.ativo) {
      nodes.push({
        id: CONSENTIMENTO,
        type: "consentimento",
        position: posicoes.get(CONSENTIMENTO) ?? { x: 0, y: 0 },
        data: { consentimento, selecionado: selecionado === CONSENTIMENTO } as unknown as DadosNo,
        draggable: false,
      });
    }

    nodes.push({
      id: CARTAO,
      type: "cartao",
      position: posicoes.get(CARTAO) ?? { x: 0, y: 0 },
      data: { capa, selecionado: selecionado === CARTAO } as unknown as DadosNo,
      draggable: false,
    });

    if (comFantasma) nodes.push({
      id: FANTASMA,
      type: "fantasma",
      position: posicoes.get(FANTASMA) ?? { x: 0, y: 0 },
      data: {} as unknown as DadosNo,
      draggable: false,
      selectable: false,
    });

    for (const c of conviteDeRamo) {
      nodes.push({
        id: c.id,
        type: "convite",
        position: posicoes.get(c.id) ?? { x: 0, y: 0 },
        data: { ramo: c.ramo } as unknown as DadosNo,
        draggable: false,
        selectable: false,
      });
    }

    const edges: Edge[] = arestasFinais.map((a) => ({
      id: a.id,
      source: a.de,
      target: a.para,
      sourceHandle: a.ramo ?? null,
      label:
        a.para === FANTASMA || a.para.startsWith("ramo:")
          ? undefined
          : a.ramo === "entao" ? "então"
          : a.ramo === "senao" ? "senão"
          : undefined,
      type: "smoothstep",
      /* A ligação com o fantasma é tracejada: ela promete um caminho que ainda
         não existe, e traço cheio prometeria fluxo já montado. */
      style: {
        stroke: a.ramo === "entao" ? "var(--fluxo-sim)" : a.ramo === "senao" ? "var(--fluxo-nao)" : "var(--fluxo-linha)",
        strokeWidth: 1.5,
        ...(a.para === FANTASMA || a.para.startsWith("ramo:") || a.de.startsWith("ramo:")
          ? { strokeDasharray: "5 4" }
          : {}),
      },
      labelStyle: { fontSize: 11, fill: "var(--fluxo-rotulo)", fontWeight: 600 },
      labelBgStyle: { fill: "var(--fluxo-fundo)" },
      labelBgPadding: [6, 2] as [number, number],
      labelBgBorderRadius: 4,
    }));

    return { nodes, edges };
  }, [grafo, problemas, selecionado, capa, consentimento]);

  const nodeTypes = useMemo(
    () => ({
      bloco: NoBloco,
      fantasma: NoProximo,
      convite: NoConviteDeRamo,
      capa: NoCapa,
      cartao: NoCartao,
      consentimento: NoConsentimento,
    }),
    [],
  );

  const aoClicar = useCallback(
    (evento: React.MouseEvent, node: Node) => {
      if (node.id === FANTASMA) {
        onAdicionarNoFim((evento.currentTarget as HTMLElement).getBoundingClientRect());
        return;
      }
      if (node.id.startsWith("ramo:")) {
        const [, condicionalId, ramo] = node.id.split(":");
        onAdicionarNoRamo(
          { condicionalId, ramo: ramo as "entao" | "senao" },
          (evento.currentTarget as HTMLElement).getBoundingClientRect(),
        );
        return;
      }
      onSelecionar(node.id);
    },
    [onSelecionar, onAdicionarNoFim, onAdicionarNoRamo],
  );

  /* Os primeiros blocos, não só o primeiro: enquadrar um nó sozinho o joga para
     o meio da tela e deixa meia altura vazia acima do começo do fluxo. */
  const aberturaDoCaminho = useMemo(
    () => [{ id: CAPA }, ...grafo.nos.slice(0, 3).map((n) => ({ id: n.id }))],
    [grafo],
  );

  return (
    /*
     * O canvas é a tela inteira, e o chrome flutua por cima. Enquanto ele era
     * uma caixa ao lado de um painel, o fluxo tinha o tamanho que sobrava —
     * numa ferramenta de desenho é o contrário: a superfície é tudo, e os
     * controles é que se espremem nas bordas.
     */
    /*
     * `z-0` cria o contexto de empilhamento do canvas.
     *
     * Sem ele, os nós do React Flow (que carregam z-index próprio, na casa do
     * milhar) competem no mesmo contexto dos cartões da prancheta e passam por
     * cima do popover. Isolado, tudo que flutua com z > 0 fica acima do desenho.
     */
    <div className="fluxo-tela absolute inset-0 z-0">
      <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={aoClicar}
          onPaneClick={() => onSelecionar(null)}
          nodesConnectable={false}
          edgesFocusable={false}
          fitView
          /*
           * Enquadra o começo do caminho, em tamanho de leitura.
           *
           * `fitView` puro encolhia até caber a árvore inteira — com treze
           * blocos isso dava zoom 0.35 e nenhum rótulo legível. A medida aqui é
           * o primeiro bloco: entra no tamanho em que se lê, e o resto do
           * caminho se percorre com o mouse, que é como se lê um fluxo.
           */
          fitViewOptions={{
            nodes: aberturaDoCaminho,
            padding: 0.1,
            maxZoom: 1,
            minZoom: 1,
          }}
          /*
           * Roda e trackpad arrastam a prancheta; a pinça dá zoom. É o gesto de
           * ferramenta de desenho — rolar para dar zoom, o padrão da biblioteca,
           * faria a trama saltar de tamanho a cada toque no trackpad.
           */
          panOnScroll
          zoomOnScroll={false}
          zoomOnPinch
          panOnDrag
          /*
           * A marca do React Flow sai do canto.
           *
           * O pacote é MIT e a bandeira existe no próprio código — nada trava.
           * Mas quem mantém a biblioteca pede que ela fique, e paga-se o plano
           * Pro justamente para escondê-la. Está desligada aqui porque é um
           * protótipo de tela cheia, onde o selo encosta no rodapé do desenho;
           * se isto virar produto, ou o selo volta ou a assinatura entra.
           */
          proOptions={{ hideAttribution: true }}
          minZoom={0.2}
          maxZoom={2}
        >
      <Background variant={BackgroundVariant.Dots} gap={14} size={1} color="var(--fluxo-ponto)" />
      </ReactFlow>
    </div>
  );
}

/** O nó do canvas. Mesma linguagem da lista: filete, selo, título e resumo. */
function NoBloco({ data }: NodeProps) {
  const { no, temErro, selecionado } = data as unknown as DadosNo;
  const b = no.bloco;
  const titulo = (ehFeedback(b) ? b.titulo : b.rotulo) || "(sem título)";

  const borda =
    selecionado ? "border-vw-deep"
    : temErro ? "border-signal-stop/70"
    : "border-ink-300";

  return (
    <NoBase
      selecionado={selecionado}
      comErro={temErro}
      style={{ width: LARGURA, height: ALTURA }}
      className="flex flex-col justify-center gap-1"
    >
      {/* O primeiro bloco não tem entrada e o fim de caminho não tem saída — os
          handles seguem as mesmas regras das setas, senão o nó promete conexão
          que o motor não faz. */}
      <Handle type="target" position={Position.Top} className="fluxo-ponta" />

      <div className="flex items-center gap-2 min-w-0">
        <SeloDoTipo bloco={b} />
        {temErro && <Badge tone="stop">erro</Badge>}
      </div>
      <div className="text-[12px] font-semibold text-ink-900 truncate leading-snug">{titulo}</div>

      {ehCondicional(b) ? (
        <>
          <Handle
            type="source"
            id="entao"
            position={Position.Bottom}
            style={{ left: "30%" }}
            className="fluxo-ponta"
          />
          <Handle
            type="source"
            id="senao"
            position={Position.Bottom}
            style={{ left: "70%" }}
            className="fluxo-ponta"
          />
        </>
      ) : ehFeedback(b) ? null : (
        <Handle type="source" position={Position.Bottom} className="fluxo-ponta" />
      )}
    </NoBase>
  );
}

/**
 * O "+" de um ramo vazio.
 *
 * Ele diz o ramo em que entra. Enquanto essa informação vinha só da etiqueta na
 * linha, os dois convites ficavam idênticos e lado a lado — e logo abaixo vinha
 * o convite do fim do caminho, também idêntico. Três botões iguais para três
 * destinos diferentes.
 */
function NoConviteDeRamo({ data }: NodeProps) {
  const { ramo } = data as unknown as { ramo: "entao" | "senao" };
  return (
    <NoFantasma
      style={{ width: CONVITE_L, height: CONVITE_A }}
      className="bg-ink-0/70 gap-1 text-[11px] font-medium"
      aria-label={`Adicionar bloco no ramo ${ramo === "entao" ? "então" : "senão"}`}
    >
      <Handle type="target" position={Position.Top} className="fluxo-ponta" />
      <IconeMais className="w-3.5 h-3.5" />
      {ramo === "entao" ? "então" : "senão"}
      <Handle type="source" position={Position.Bottom} className="fluxo-ponta" />
    </NoFantasma>
  );
}

/**
 * A capa, no topo do caminho.
 *
 * Só entrada, sem chegada: nada aponta para ela — é onde tudo começa. O resumo
 * embaixo do título diz o que está configurado hoje, para não ser preciso abrir
 * o painel só para lembrar se a pesquisa pede CPF ou convida.
 */
function NoCapa({ data }: NodeProps) {
  const { capa, selecionado } = data as unknown as { capa: ResumoDaCapa; selecionado: boolean };

  return (
    <NoBase
      selecionado={selecionado}
      style={{ width: LARGURA, height: ALTURA }}
      className="flex flex-col justify-center gap-1"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Badge tone="vw">capa</Badge>
      </div>
      <div className="text-[12px] font-semibold text-ink-900 truncate leading-snug">
        Fundo: {NOME_DO_FUNDO(capa.fundo).toLowerCase()}
      </div>
      <Handle type="source" position={Position.Bottom} className="fluxo-ponta" />
    </NoBase>
  );
}

/**
 * O cartão da capa, logo abaixo dela.
 *
 * Mostra o que ele pergunta — o enunciado, não o tipo: é o que a pessoa vai
 * ler na tela. Quando só convida, mostra o texto do botão.
 */
function NoCartao({ data }: NodeProps) {
  const { capa, selecionado } = data as unknown as { capa: ResumoDaCapa; selecionado: boolean };
  const convida = capa.entrada === "convite";

  return (
    <NoBase
      selecionado={selecionado}
      style={{ width: LARGURA, height: ALTURA }}
      className="flex flex-col justify-center gap-1"
    >
      <Handle type="target" position={Position.Top} className="fluxo-ponta" />
      <div className="flex items-center gap-2 min-w-0">
        <Badge tone="neutral">cartão</Badge>
      </div>
      <div className="text-[12px] font-semibold text-ink-900 truncate leading-snug">
        {convida
          ? `Botão: ${capa.rotuloDoConvite?.trim() || "Começar"}`
          : capa.pergunta?.rotulo || "(sem enunciado)"}
      </div>
      <Handle type="source" position={Position.Bottom} className="fluxo-ponta" />
    </NoBase>
  );
}

/** O nó fantasma no fim do caminho. */
function NoProximo() {
  return (
    <NoFantasma
      style={{ width: LARGURA, height: ALTURA }}
      aria-label="Adicionar o próximo bloco"
    >
      <Handle type="target" position={Position.Top} className="fluxo-ponta" />
      <IconeMais />
    </NoFantasma>
  );
}


/**
 * O papel do bloco no fluxo — não o identificador dele.
 *
 * A pergunta mostrava o `campo` (`novaPergunta`) enquanto os outros mostravam o
 * papel (`busca`, `se`, `fim`): dois vocabulários no mesmo selo, e justamente o
 * da pergunta não dizia o que o bloco faz. O identificador continua visível
 * onde é usado — no inspetor, ao lado do enunciado, e na aba Lista.
 */
function SeloDoTipo({ bloco }: { bloco: Bloco }) {
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

/**
 * A autorização no desenho.
 *
 * Selo próprio, e não o de "pergunta": ela não sai da árvore e não pode ser
 * arrastada nem apagada como um bloco. Quem clica cai no painel do texto dela.
 */
function NoConsentimento({ data }: NodeProps) {
  const { consentimento, selecionado } = data as unknown as {
    consentimento: { pergunta: string };
    selecionado: boolean;
  };

  return (
    <NoBase
      selecionado={selecionado}
      style={{ width: LARGURA, height: ALTURA }}
      className="flex flex-col justify-center gap-1"
    >
      <Handle type="target" position={Position.Top} className="fluxo-ponta" />
      <div className="flex items-center gap-2 min-w-0">
        <Badge tone="neutral">autorização</Badge>
      </div>
      <div className="text-[12px] font-semibold text-ink-900 truncate leading-snug">
        {consentimento.pergunta}
      </div>
      <Handle type="source" position={Position.Bottom} className="fluxo-ponta" />
    </NoBase>
  );
}
