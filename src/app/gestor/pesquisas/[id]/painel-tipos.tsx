"use client";

import { type DestinoFluxo } from "@/lib/fluxo";
import { Hook } from "@/lib/types";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { TipoNovo } from "./painel-bloco";

/* Hallmark · component: painel de escolha · genre: modern-minimal · theme: projeto (tokens travados)
 * hierarquia: 15 / 13 / 12 / 11 · sem sombra · raio 8px
 * pre-emit critique: P5 H5 E4 S5 R5 V4
 */

/**
 * A escolha do tipo de bloco, no painel da direita.
 *
 * É o mesmo lugar onde o inspetor abre — e de propósito: a direita é a coluna
 * de "o que este bloco é", seja para criar, seja para editar. Enquanto os tipos
 * moravam num menuzinho embaixo do botão, cada opção cabia numa palavra, e
 * "consulta" e "condicional" só se distinguem quando dá para ler o que cada uma
 * faz.
 *
 * Sem busca: são quatro. Campo de busca para quatro itens é enfeite que rouba a
 * primeira linha do painel.
 */

interface Opcao {
  tipo: TipoNovo;
  rotulo: string;
  descricao: string;
  icone: (p: { className?: string }) => React.ReactElement;
  /** Falso esconde a opção — consulta sem nenhuma fonte cadastrada, por exemplo. */
  disponivel?: boolean;
}

/** De onde o popover nasce: o retângulo do botão que o abriu, em coordenadas de tela. */
export type Ancora = { x: number; y: number; largura: number; altura: number };

export function PainelTipos({
  destino,
  ancora,
  hooks,
  abertura = false,
  saindo = false,
  onEscolher,
  onFechar,
}: {
  destino: DestinoFluxo;
  ancora: Ancora;
  hooks: Hook[];
  /** Primeiro bloco da pesquisa: só entra o que sabe abrir um caminho. */
  abertura?: boolean;
  /** Ligado enquanto a animação de saída roda, antes do desmonte. */
  saindo?: boolean;
  onEscolher: (tipo: TipoNovo, destino: DestinoFluxo) => void;
  onFechar: () => void;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const cabecalho = useRef<HTMLDivElement>(null);
  const lista = useRef<HTMLDivElement>(null);

  /*
   * A altura que o painel teria se nada o cortasse.
   *
   * Ela não dá para estimar de fora: depende de quantas opções entraram (a
   * abertura mostra duas, o resto mostra quatro) e de quantas linhas cada
   * descrição ocupou na largura de 304px. Medir é uma leitura só, no primeiro
   * quadro — e é ela que decide se o painel abre para baixo, para cima ou
   * desliza. Antes disso vale a estimativa de quatro opções: errar para o lado
   * maior faz o painel subir, que é o comportamento seguro.
   */
  const [alturaNatural, setAlturaNatural] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (!caixa.current || !cabecalho.current || !lista.current) return;
    /* `maxHeight` corta a caixa de borda, então os filetes entram na conta. Sem
       eles sobravam dois pixels — e dois pixels bastam para a barra de rolagem
       aparecer num painel que cabe inteiro. */
    const filetes = caixa.current.offsetHeight - caixa.current.clientHeight;
    setAlturaNatural(cabecalho.current.offsetHeight + lista.current.scrollHeight + filetes);
  }, [abertura, hooks.length, destino]);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    };

    /*
     * Clicar fora fecha — sem botão de fechar e sem véu por cima do canvas.
     *
     * O véu seria o caminho curto, mas ele engoliria o arrasto da prancheta: o
     * primeiro gesto depois de abrir o painel seria comido por um retângulo
     * invisível. Escutar o `mousedown` no documento deixa o canvas vivo.
     *
     * `data-abre-tipos` marca os botões que abrem o painel: sem essa exceção, o
     * mesmo clique que abre também fecharia, e ele nunca apareceria.
     */
    const aoApontar = (e: MouseEvent) => {
      const alvo = e.target as HTMLElement | null;
      if (!alvo) return;
      if (caixa.current?.contains(alvo)) return;
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

  /*
   * Na abertura, só o que faz sentido como primeiro bloco.
   *
   * "Se / senão" precisa de um fato para comparar, e no começo não há nenhum
   * coletado; "tela final" encerraria a pesquisa antes de perguntar qualquer
   * coisa. Oferecer os dois ali é oferecer dois becos.
   */
  const grupos: { titulo: string; itens: Opcao[] }[] = [
    {
      titulo: "Coletar e consultar",
      itens: [
        {
          tipo: "pergunta",
          rotulo: "Pergunta",
          descricao: "Pede uma informação a quem responde.",
          icone: IconePergunta,
        },
        {
          tipo: "consulta",
          rotulo: "Consulta a uma fonte",
          descricao: "Busca o dado numa fonte, sem perguntar.",
          icone: IconeConsulta,
          disponivel: hooks.length > 0,
        },
      ],
    },
    {
      titulo: "Conduzir o caminho",
      itens: [
        {
          tipo: "condicional",
          rotulo: "Se / senão",
          descricao: "Separa o caminho conforme uma condição.",
          icone: IconeCondicional,
        },
        {
          tipo: "feedback",
          rotulo: "Tela final",
          descricao: "Encerra o caminho com uma mensagem.",
          icone: IconeFim,
        },
      ],
    },
  ];

  const visiveis = abertura
    ? grupos
        .map((g) => ({
          ...g,
          itens: g.itens.filter((i) => i.tipo === "pergunta" || i.tipo === "consulta"),
        }))
        .filter((g) => g.itens.length > 0)
    : grupos;

  /*
   * O popover nasce colado ao botão que o abriu, não numa coluna fixa.
   *
   * Abre para baixo; se não couber, sobe e ancora pelo pé do botão — é o que
   * faz a barra de ferramentas do rodapé abrir para cima sem sair da tela. O
   * lado esquerdo acompanha o botão e recua o suficiente para não vazar pela
   * direita.
   */
  const MARGEM = 16;
  /* 304px: a frase do subtítulo pede 254px numa linha, e com 20px de padding de
     cada lado uma caixa de 292 deixava só 250 — quatro pixels de diferença
     jogavam a última palavra para a segunda linha. */
  const LARGURA = 304;
  /* Teto alto o bastante para as quatro opções caberem sem rolagem: a lista é
     curta e uma barra de rolagem num menu de quatro itens é ruído. */
  const TETO = 560;
  const ESTIMATIVA = 440;
  const janela =
    typeof window === "undefined"
      ? { w: 1440, h: 900 }
      : { w: window.innerWidth, h: window.innerHeight };

  const espacoAbaixo = janela.h - (ancora.y + ancora.altura) - 8 - MARGEM;
  const espacoAcima = ancora.y - 8 - MARGEM;

  /*
   * Três posições, nesta ordem: abaixo, acima, deslizado.
   *
   * A regra antiga abria para baixo sempre que sobrassem 280px — e o painel
   * inteiro pede uns 440. Perto do rodapé isso dava o pior dos mundos: aberto
   * para baixo, cortado, com barra de rolagem para ver a última opção, num menu
   * de quatro itens.
   *
   * Agora a comparação é com a altura de verdade. Quando nenhum dos dois lados
   * comporta o painel — janela baixa, âncora no meio —, ele **desliza** para
   * dentro da tela em vez de encolher: sobrepõe um pedaço do canvas, que é
   * barato, e nunca rola, que é o que incomodava. É o mesmo "shift on collision"
   * que Radix e Floating UI aplicam.
   */
  const alturaAlvo = Math.min(TETO, janela.h - 2 * MARGEM, alturaNatural ?? ESTIMATIVA);
  const cabeAbaixo = espacoAbaixo >= alturaAlvo;
  const cabeAcima = espacoAcima >= alturaAlvo;
  const abreParaBaixo = cabeAbaixo || (!cabeAcima && espacoAbaixo >= espacoAcima);

  const posicao: React.CSSProperties = {
    left: Math.max(MARGEM, Math.min(ancora.x, janela.w - LARGURA - MARGEM)),
    maxHeight: alturaAlvo,
    ...(cabeAbaixo || cabeAcima
      ? abreParaBaixo
        ? { top: ancora.y + ancora.altura + 8 }
        : { bottom: janela.h - ancora.y + 8 }
      : {
          top: Math.max(
            MARGEM,
            Math.min(ancora.y + ancora.altura + 8, janela.h - alturaAlvo - MARGEM),
          ),
        }),
  };

  const ondeEntra = abertura
    ? "Escolha um gatilho para iniciar sua pesquisa."
    : destino
    ? `Entra no ramo ${destino.ramo === "entao" ? "“então”" : "“senão”"}.`
    : "Entra no fim do caminho principal.";

  return (
    /*
     * `ink-50`, não branco: o popover se destaca da mesa por ser um degrau mais
     * claro que ela, e não por virar uma folha de papel colada em cima. Branco
     * puro nesta tela só existe dentro de campo de formulário.
     */
    <div
      ref={caixa}
      style={posicao}
      className={`fixed z-40 w-[19rem] bg-ink-50 border hairline rounded-ferramenta flex flex-col
                  overflow-hidden ${
                    saindo
                      ? abreParaBaixo ? "painel-sai" : "painel-sai-baixo"
                      : abreParaBaixo ? "painel-entra" : "painel-entra-baixo"
                  }`}
    >
      {/*
       * Escala de popover: 15 no título, 13 no nome da opção, 12 no subtítulo
       * e na descrição, 11 no rótulo do grupo.
       *
       * Ela já foi 20/16/14 — medida de painel fixo, onde o título dividia a
       * tela com o canvas e precisava desse porte. Num popover de 312px o mesmo
       * 20px vira manchete de cartaz dentro de um cartão de baralho.
       *
       * O que não muda com o tamanho: os níveis continuam distinguíveis sem
       * régua. Hierarquia é diferença perceptível, não números grandes.
       */}
      <div ref={cabecalho} className="px-5 pt-4 pb-3 shrink-0">
        <h2 className="text-[15px] font-semibold tracking-tight leading-[1.2]">
          {abertura ? "Como sua pesquisa começa?" : "Qual é o próximo bloco?"}
        </h2>
        {/* 8px do título: mais que isso e o subtítulo deixa de ler como a
            segunda linha da mesma frase. */}
        <p className="mt-2 text-[12px] text-ink-600 leading-[1.4]">{ondeEntra}</p>
      </div>

      {/*
       * A lista usa o mesmo recuo do cabeçalho: 20px.
       *
       * Enquanto as opções eram linhas de texto com realce só no hover, valia a
       * pena recuá-las menos para o realce sangrar além da palavra. Agora que
       * cada opção é um bloco com fundo e filete, a borda dele é o que o olho
       * alinha — e ela estava 10px mais perto da parede que o título.
       */}
      <div ref={lista} className="overflow-y-auto px-5 pb-4">
        {visiveis.map((g, iGrupo) => {
          const itens = g.itens.filter((i) => i.disponivel !== false);
          if (itens.length === 0) return null;
          return (
            <div key={g.titulo} className={iGrupo > 0 ? "mt-5 pt-5 border-t hairline" : ""}>
              {/* O grupo se separa por filete, não por corpo de texto: assim o
                  rótulo pode ser o menor item do painel sem sumir, e a divisão
                  não compete com o nome das opções. */}
              <div className="pb-2 text-[11px] font-semibold text-ink-600">{g.titulo}</div>
              {/*
               * Cada opção é um bloco, não uma linha de lista.
               *
               * Soltas sobre o painel, as quatro viravam um parágrafo só de
               * texto cinza com dois títulos no meio — a divisão entre elas
               * dependia de espaço em branco, que é o que o olho lê por último.
               * O fundo mais escuro que a superfície do painel, com filete, dá
               * a borda que faltava.
               */}
              <div className="space-y-2">
              {itens.map((i) => (
                <button
                  key={i.tipo}
                  type="button"
                  onClick={() => onEscolher(i.tipo, destino)}
                  className="w-full text-left px-3 py-2.5 rounded-md border hairline bg-ink-100
                             hover:bg-ink-200 hover:border-ink-500 transition
                             flex items-start gap-3
                             outline outline-2 outline-offset-2 outline-transparent focus-visible:outline-vw-blue"
                >
                  <i.icone className="w-5 h-5 mt-px shrink-0 text-ink-700" />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold leading-[1.3]">
                      {i.rotulo}
                    </span>
                    <span className="block text-[12px] text-ink-600 leading-[1.4] mt-0.5">
                      {i.descricao}
                    </span>
                  </span>
                </button>
              ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* Ícones à mão, como o resto do produto. */
const traco = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconePergunta({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} {...traco}>
      <path d="M9.4 9.2a2.7 2.7 0 1 1 3.5 2.6c-.7.2-1.1.8-1.1 1.5v.5" />
      <path d="M12 17.2v.1" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

function IconeConsulta({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} {...traco}>
      <ellipse cx="12" cy="6" rx="7" ry="2.8" />
      <path d="M5 6v6c0 1.6 3.1 2.8 7 2.8s7-1.2 7-2.8V6" />
      <path d="M5 12v6c0 1.6 3.1 2.8 7 2.8s7-1.2 7-2.8v-6" />
    </svg>
  );
}

function IconeCondicional({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} {...traco}>
      <path d="M12 3v6" />
      <path d="M12 9L6 14v7" />
      <path d="M12 9l6 5v7" />
    </svg>
  );
}

function IconeFim({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} {...traco}>
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <path d="M8 12.4l2.6 2.6L16 9.6" />
    </svg>
  );
}
