"use client";

import { useAviso } from "@/components/Avisos";
import { contarBlocos } from "@/lib/engine";
import { Apresentacao, Bloco, Desfecho, Hook, PesquisaStatus, RuleSet } from "@/lib/types";
import {
  atualizarBloco,
  identificadoresEmUso,
  inserirEm,
  moverNaLista,
  removerBloco,
  reordenarPara,
  sugerirIdentificador,
  temErro,
  validarPesquisa,
} from "@/lib/validacao-pesquisa";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BarraDeAdicao, Destino, ListaBlocos } from "./lista-blocos";
import { PainelBloco, TipoNovo } from "./painel-bloco";
import { PainelCapa } from "./painel-capa";
import { PainelCartao } from "./painel-cartao";
import { PainelDesfechos } from "./painel-desfechos";
import { PainelPublicacao } from "./painel-publicacao";
import { Ancora, PainelTipos } from "./painel-tipos";
import { PainelRegras } from "./painel-regras";
import { CartaoPesquisa } from "./popover-pesquisa";
import { SimuladorFluxo } from "./simulador-fluxo";

/*
 * O canvas mede o próprio contêiner para posicionar os nós, e no servidor não
 * existe contêiner para medir. Carregado só no cliente, e fora do bundle de
 * quem nunca abre a tela — a biblioteca é grande perto do resto do sistema.
 */
const MapaFluxo = dynamic(() => import("./mapa-fluxo").then((m) => m.MapaFluxo), {
  ssr: false,
});

/**
 * O id do nó da capa, repetido aqui de propósito.
 *
 * Importá-lo de `mapa-fluxo` puxaria o React Flow inteiro para o bundle desta
 * tela, desfazendo o `dynamic` acima — é uma constante de três palavras contra
 * uma biblioteca de canvas.
 */
const CAPA = "__capa__";
const CARTAO = "__cartao__";

/**
 * O canvas só entra depois que o componente montou no navegador.
 *
 * Com `ssr: false`, o servidor não emite nada no lugar do módulo, mas o
 * `loading` do `dynamic` aparece já no primeiro render do cliente — um `div` a
 * mais que o HTML do servidor não tinha, e a hidratação falhava com "Expected
 * server HTML to contain a matching div".
 *
 * Guardando por um estado que só vira `true` no efeito, os dois lados começam
 * iguais e a troca acontece depois da hidratação, quando já não há o que casar.
 */
function EsperandoOCanvas() {
  return (
    <div className="absolute inset-0 flex items-center justify-center text-[13px] text-ink-600">
      Desenhando o fluxo...
    </div>
  );
}

/** As vistas que abrem como folha por cima da prancheta. */
type Folha = "regras" | "desfechos" | "simulacao" | null;

/**
 * Os dois modos de montar a pesquisa.
 *
 * `fluxo` é o desenho; `lista` é a árvore aninhada, que faz o que o canvas não
 * faz — mover um bloco de lugar. São formas de editar o mesmo dado, e por isso
 * alternam no lugar, sem sair da tela.
 */
type Modo = "fluxo" | "lista";

/**
 * O editor de pesquisa — uma prancheta, não uma página.
 *
 * A tela inteira é superfície de desenho: sem cabeçalho do sistema, sem título
 * de página, sem caixa de leitura. O que resta de interface flutua nos cantos,
 * em escala de ferramenta — texto de 12 a 13px, alturas de 32 a 40px. É a
 * proporção de software, e ela existe porque aqui se passa muito tempo: cada
 * píxel de cromo é píxel que o fluxo não ocupa.
 *
 * As outras vistas — lista, regras, simulação, informações — deixaram de ser
 * abas e viraram folhas sobre a prancheta. Aba dá a entender que são telas
 * irmãs; elas são inspeções do mesmo desenho, e fecham de volta para ele.
 */
export function ConstrutorPesquisa({
  pesquisaId,
  blocosIniciais,
  blocosPublicados,
  temRascunhoInicial,
  podeEditar,
  nomeUsuario,
  hooks,
  configuracao,
  apresentacaoInicial,
  versoes,
  versaoAtivaId,
  desfechosIniciais,
}: {
  pesquisaId: string;
  /** O que se edita: o rascunho, se houver; senão, o que está no ar. */
  blocosIniciais: Bloco[];
  /** O que está no ar — para onde "descartar alterações" volta. */
  blocosPublicados: Bloco[];
  temRascunhoInicial: boolean;
  podeEditar: boolean;
  nomeUsuario: string;
  hooks: Hook[];
  configuracao: {
    nome: string;
    descricao: string;
    status: PesquisaStatus;
    chamada: string;
  };
  apresentacaoInicial: Apresentacao;
  versoes: RuleSet[];
  versaoAtivaId?: string;
  /** Os fins possíveis desta pesquisa, como estão gravados. */
  desfechosIniciais: Desfecho[];
}) {
  const [blocos, setBlocos] = useState<Bloco[]>(blocosIniciais);
  const [apresentacao, setApresentacao] = useState<Apresentacao>(apresentacaoInicial);
  /* O texto que a capa escreve. Mora aqui, e não no cartão da marca, porque é o
     conteúdo da tela de entrada — ver o painel da capa. */
  const [texto, setTexto] = useState({
    chamada: configuracao.chamada,
    descricao: configuracao.descricao,
  });
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [folha, setFolha] = useState<Folha>(null);
  const [modo, setModo] = useState<Modo>("fluxo");
  const [montado, setMontado] = useState(false);

  useEffect(() => setMontado(true), []);
  /*
   * Onde o próximo bloco entra. `undefined` quer dizer painel fechado — e não
   * `null`, que já significa "no fim do caminho principal".
   */
  const [escolhendoTipo, setEscolhendoTipo] = useState<Destino | undefined>(undefined);
  /* De onde o popover sai — o retângulo do botão que o abriu. */
  const [ancora, setAncora] = useState<Ancora>({ x: 0, y: 0, largura: 0, altura: 0 });
  /* Segura o painel montado enquanto a animação de saída roda. */
  const [fechandoTipos, setFechandoTipos] = useState(false);
  const [arrastado, setArrastado] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  /* A situação mora aqui porque é o botão de publicar que a muda. */
  const [status, setStatus] = useState<PesquisaStatus>(configuracao.status);
  const [publicando, setPublicando] = useState(false);
  const [mostrandoLink, setMostrandoLink] = useState(false);
  /* Há edição salva que ainda não vale para quem responde. */
  const [temRascunho, setTemRascunho] = useState(temRascunhoInicial);
  /*
   * Os fins possíveis. Ficam com a configuração, e não com os blocos: mudar o
   * texto de um desfecho não é mudar o percurso, e esperar o "Publicar" para
   * corrigir uma vírgula seria desproporcional.
   */
  const [desfechos, setDesfechos] = useState<Desfecho[]>(desfechosIniciais);
  const { avisar } = useAviso();

  const problemas = useMemo(() => validarPesquisa(blocos), [blocos]);
  const erros = problemas.filter((p) => p.gravidade === "erro");
  const bloqueado = temErro(problemas);
  const contagem = useMemo(() => contarBlocos(blocos), [blocos]);
  const blocoEmFoco = useMemo(() => acharBloco(blocos, selecionado), [blocos, selecionado]);

  function mudar(novos: Bloco[]) {
    setBlocos(novos);
    setSalvo(false);
  }

  /*
   * A capa salva sozinha, a cada mudança — e não junto do botão "Salvar".
   *
   * Aquele botão manda a árvore de blocos inteira e é recusado quando ela tem
   * erro. Trocar o fundo ficaria refém de uma pergunta sem identificador em
   * outro canto do fluxo, o que não tem nada a ver. São dois assuntos e são dois
   * caminhos: PATCH para a configuração, PUT para os blocos.
   */
  /*
   * A gravação espera a pessoa parar de digitar.
   *
   * A tela responde na hora — o estado local muda a cada tecla, e é dele que
   * saem o nó do fluxo e o campo. O que espera é a viagem ao servidor: sem esta
   * folga, escrever um título de quarenta letras eram quarenta PATCH, e a
   * resposta de um podia chegar depois da do seguinte e regravar texto velho.
   */
  const gravacao = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (gravacao.current) clearTimeout(gravacao.current); }, []);

  function gravarConfig(corpo: Record<string, unknown>) {
    if (gravacao.current) clearTimeout(gravacao.current);
    gravacao.current = setTimeout(async () => {
      const res = await fetch("/api/pesquisa", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pesquisaId, ...corpo }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        avisar(json.detalhe ?? json.erro ?? "Não deu para salvar a capa.", "stop");
      }
    }, 400);
  }

  function mudarCapa(patch: Partial<Apresentacao>) {
    const nova = { ...apresentacao, ...patch };
    setApresentacao(nova);
    gravarConfig({ apresentacao: nova });
  }

  function mudarDesfechos(novos: Desfecho[]) {
    setDesfechos(novos);
    gravarConfig({ desfechos: novos });
  }

  function mudarTexto(patch: { chamada?: string; descricao?: string }) {
    const novo = { ...texto, ...patch };
    setTexto(novo);
    gravarConfig(novo);
  }

  function abrirTipos(destino: Destino, origem?: React.MouseEvent<HTMLElement> | DOMRect) {
    const r = origem instanceof DOMRect ? origem : origem?.currentTarget.getBoundingClientRect();
    if (r) setAncora({ x: r.left, y: r.top, largura: r.width, altura: r.height });
    setSelecionado(null);
    setFechandoTipos(false);
    setEscolhendoTipo(destino);
  }

  function fecharTipos() {
    if (escolhendoTipo === undefined) return;
    setFechandoTipos(true);
    /* 130ms é a duração de `.painel-sai`; desmontar antes cortaria a animação
       pela metade, e depois deixaria um painel morto na tela. */
    window.setTimeout(() => {
      setEscolhendoTipo(undefined);
      setFechandoTipos(false);
    }, 130);
  }

  function adicionar(tipo: TipoNovo, destino: Destino) {
    const marca = Date.now().toString(36);
    fecharTipos();

    if (tipo === "pergunta") {
      const id = `q_${marca}`;
      mudar(
        inserirEm(blocos, destino, {
          id,
          bloco: "pergunta",
          campo: sugerirIdentificador("nova pergunta", identificadoresEmUso(blocos)),
          rotulo: "Nova pergunta",
          tipo: "texto",
          obrigatoria: true,
        }),
      );
      setSelecionado(id);
      return;
    }

    if (tipo === "condicional") {
      const id = `cond_${marca}`;
      mudar(
        inserirEm(blocos, destino, {
          id,
          bloco: "condicional",
          rotulo: "Nova condição",
          condicao: { fato: "uber.encontrado", operador: "truthy" },
          entao: [],
          senao: [],
        }),
      );
      setSelecionado(id);
      return;
    }

    if (tipo === "consulta") {
      const hook = hooks.find((h) => h.ativo) ?? hooks[0];
      if (!hook) return;
      const id = `consulta_${marca}`;
      mudar(
        inserirEm(blocos, destino, {
          id,
          bloco: "consulta",
          rotulo: `Consultar ${hook.nome}`,
          hookId: hook.id,
          argumentos: Object.fromEntries(hook.parametros.map((p) => [p.nome, ""])),
          obrigatoria: false,
        }),
      );
      setSelecionado(id);
      return;
    }

    const id = `fim_${marca}`;
    mudar(
      inserirEm(blocos, destino, {
        id,
        bloco: "feedback",
        tipo: "info",
        titulo: "Obrigado!",
        mensagem: "Sua resposta foi registrada.",
      }),
    );
    setSelecionado(id);
  }

  const acoes = {
    adicionarPergunta: (d: Destino) => adicionar("pergunta", d),
    adicionarCondicional: (d: Destino) => adicionar("condicional", d),
    adicionarConsulta: (d: Destino) => adicionar("consulta", d),
    adicionarFeedback: (d: Destino) => adicionar("feedback", d),
  };

  /**
   * Grava a árvore. `publicar` decide se vai para o rascunho ou para o ar.
   *
   * Devolve se deu certo, porque publicar depende disso.
   */
  async function gravarBlocos(publicar = false) {
    const res = await fetch("/api/pesquisa", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pesquisaId, blocos, publicar }),
    });
    const json = await res.json();
    if (!res.ok) {
      avisar(
        json.detalhe ?? json.problemas?.[0]?.mensagem ?? json.erro ?? "Falha ao salvar.",
        "stop",
      );
      return false;
    }
    setSalvo(true);
    setTemRascunho(json.temRascunho === true);
    return true;
  }

  async function salvar() {
    setSalvando(true);
    const deu = await gravarBlocos();
    setSalvando(false);
    if (deu) {
      /* A frase diz onde a mudança foi parar. "Pesquisa salva" com a pesquisa no
         ar deixava no ar a dúvida de quem já está respondendo. */
      avisar(
        status === "ativa" && temRascunho
          ? "Rascunho salvo. Quem responde continua na versão publicada."
          : "Pesquisa salva.",
        "go",
      );
    }
  }

  /*
   * Publicar grava e promove numa tacada só.
   *
   * Duas requisições — salvar e depois publicar — dariam um meio-termo possível:
   * blocos gravados e situação intacta, com a tela dizendo que publicou. É por
   * isso que o servidor faz as duas coisas no mesmo pedido.
   *
   * O botão fica desligado enquanto houver erro de validação: o que ele promete
   * é uma pesquisa que responde, não um endereço que abre.
   */
  async function publicar() {
    setPublicando(true);
    const deu = await gravarBlocos(true);
    setPublicando(false);
    if (deu) {
      setStatus("ativa");
      setMostrandoLink(true);
      avisar(status === "ativa" ? "Alterações no ar." : "Pesquisa no ar.", "go");
    }
  }

  /** Volta para o que está publicado, jogando fora o que foi editado depois. */
  async function descartarRascunho() {
    const res = await fetch("/api/pesquisa", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pesquisaId, descartarRascunho: true }),
    });
    if (!res.ok) {
      avisar("Não deu para descartar.", "stop");
      return;
    }
    setBlocos(blocosPublicados);
    setTemRascunho(false);
    setSalvo(true);
    setSelecionado(null);
    avisar("Alterações descartadas.", "go");
  }

  async function gravarStatus(novo: PesquisaStatus) {
    const res = await fetch("/api/pesquisa", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pesquisaId, status: novo }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      avisar(json.detalhe ?? json.erro ?? "Não deu para mudar a situação.", "stop");
      return false;
    }
    setStatus(novo);
    return true;
  }

  async function mudarStatus(novo: PesquisaStatus) {
    if (await gravarStatus(novo)) {
      avisar(novo === "encerrada" ? "Pesquisa encerrada." : "Pesquisa fora do ar.", "go");
      setMostrandoLink(false);
    }
  }

  return (
    /* `fixed`: a prancheta é a janela. Numa página que rola, o pan do canvas e a
       rolagem do documento disputariam o mesmo gesto de trackpad. */
    <div className="fixed inset-0 bg-ink-100 overflow-hidden">
      {modo === "fluxo" ? (
        !montado ? (
          <EsperandoOCanvas />
        ) : (
        <MapaFluxo
          blocos={blocos}
          problemas={problemas}
          selecionado={selecionado}
          capa={apresentacao}
          onSelecionar={setSelecionado}
          onAdicionarNoFim={(retangulo) => abrirTipos(null, retangulo)}
          onAdicionarNoRamo={(destino, retangulo) => abrirTipos(destino, retangulo)}
        />
        )
      ) : (
        /*
         * Fundo liso e mais claro que a mesa.
         *
         * A trama de pontos existe para dar referência de posição a quem
         * arrasta e dá zoom — no modo lista não há nem uma coisa nem outra, e
         * ela vira só textura atrás de texto. Aqui o fundo tem uma função só:
         * sustentar a leitura das linhas.
         */
        <div className="absolute inset-0 bg-ink-50 overflow-y-auto pt-[4.5rem] pb-16">
          <div className="escala-ferramenta max-w-5xl mx-auto px-6">
            {problemas
              .filter((p) => p.blocoId === null)
              .map((p, i) => (
                <div
                  key={i}
                  className="border border-signal-stop/45 bg-signal-stop/10 rounded-ferramenta p-4 mb-5"
                >
                  {p.mensagem}
                </div>
              ))}

            <ListaBlocos
              blocos={blocos}
              nivel={0}
              aberto={selecionado}
              setAberto={setSelecionado}
              problemas={problemas}
              arrastado={arrastado}
              setArrastado={setArrastado}
              onSoltar={(alvoId) => {
                if (!arrastado || arrastado === alvoId) return;
                mudar(reordenarPara(blocos, arrastado, alvoId));
                setArrastado(null);
              }}
              onPatch={(id, patch) => mudar(atualizarBloco(blocos, id, patch))}
              onRemover={(id) => mudar(removerBloco(blocos, id))}
              onMover={(id, d) => mudar(moverNaLista(blocos, id, d))}
              acoes={acoes}
              todosOsBlocos={blocos}
              hooks={hooks}
            />

            <BarraDeAdicao acoes={acoes} destino={null} hooks={hooks} />
          </div>
        </div>
      )}

      {/* ---------- canto superior esquerdo: o que é este arquivo ---------- */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        {/*
         * A saída da prancheta.
         *
         * A tela cobre a janela inteira e não tem cabeçalho do sistema — o que
         * é certo para desenhar, mas deixava a seta do navegador como único
         * caminho de volta. Numa ferramenta que se abre para editar uma coisa,
         * voltar para a lista é uma ação, não um gesto do navegador.
         */}
        <Link
          href="/gestor/pesquisas"
          aria-label="Voltar para as pesquisas"
          title="Voltar para as pesquisas"
          className="w-10 h-10 shrink-0 flex items-center justify-center bg-ink-0 border hairline-strong
                     rounded-ferramenta text-ink-700 hover:text-vw-deep hover:border-vw-deep transition
                     outline outline-2 outline-offset-2 outline-transparent focus-visible:outline-vw-blue"
        >
          <svg viewBox="0 0 24 24" aria-hidden className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Link>

        <CartaoPesquisa
          pesquisaId={pesquisaId}
          inicial={{ nome: configuracao.nome }}
          podeEditar={podeEditar}
        />

        {/* O modo de edição fica junto do nome, à esquerda: é como se monta.
            À direita ficam as inspeções — regras e simulação —, que olham o que
            já está montado. */}
        <div className="flex items-center bg-ink-0 border hairline-strong rounded-ferramenta overflow-hidden">
          {(
            [
              { id: "fluxo" as const, rotulo: "Fluxo", contagem: undefined },
              { id: "lista" as const, rotulo: "Lista", contagem: contagem.perguntas },
            ]
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={modo === m.id}
              onClick={() => {
                setSelecionado(null);
                setModo(m.id);
              }}
              className={
                "h-10 px-3.5 text-[13px] transition border-r hairline last:border-r-0 " +
                (modo === m.id
                  ? "bg-vw-deep text-ink-0"
                  : "text-ink-700 hover:bg-ink-100 hover:text-ink-900")
              }
            >
              <span className="flex items-center gap-1.5">
                {m.rotulo}
                {m.contagem !== undefined && (
                  <span className={modo === m.id ? "text-[11px] text-ink-0/70" : "text-[11px] text-ink-600"}>
                    {m.contagem}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ---------- canto superior direito: vistas e gravação ---------- */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <div className="flex items-center bg-ink-0 border hairline-strong rounded-ferramenta overflow-hidden">
          {[
            { id: "regras" as const, rotulo: "Regras" },
            { id: "desfechos" as const, rotulo: "Desfechos" },
            { id: "simulacao" as const, rotulo: "Simulação" },
          ].map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setFolha(v.id)}
              className="h-10 px-3.5 text-[13px] text-ink-700 hover:bg-ink-100 hover:text-ink-900
                         transition border-r hairline last:border-r-0 flex items-center gap-1.5"
            >
              {v.rotulo}
            </button>
          ))}
        </div>

        {/* O contador só existe quando há erro; o Salvar é peça própria, na
            mesma altura do cartão de vistas. Dentro de um cartão branco, ele
            lia como conteúdo de painel, e não como a ação da tela. */}
        {erros.length > 0 && (
          <div className="flex items-center bg-ink-0 border hairline-strong rounded-ferramenta px-3 h-[42px]">
            <span className="text-[12px] font-medium text-signal-stop">
              {erros.length} erro{erros.length > 1 ? "s" : ""}
            </span>
          </div>
        )}

        {/*
         * O aviso de divergência entre o que se edita e o que está no ar.
         *
         * Só aparece com a pesquisa publicada: num rascunho, "não publicado" é
         * o estado inteiro da coisa e o aviso seria ruído permanente. Ele traz
         * o descarte junto porque é a única outra saída — ou vai para o ar, ou
         * volta para o que já estava lá.
         */}
        {status === "ativa" && temRascunho && (
          <div className="flex items-center gap-2.5 bg-ink-0 border border-signal-warn/50 rounded-ferramenta px-3 h-[42px]">
            <span className="text-[12px] font-medium text-ink-800">Alterações não publicadas</span>
            {/* A prévia abre o rascunho salvo — é o único jeito de ver a versão
                nova na tela de verdade sem colocá-la no ar. */}
            <a
              href={`/motorista?pesquisa=${pesquisaId}&previa=1`}
              target="_blank"
              rel="noreferrer"
              className="text-[12px] font-semibold text-ink-600 underline decoration-ink-300
                         hover:text-vw-deep hover:decoration-vw-deep transition"
            >
              Ver prévia
            </a>
            <button
              type="button"
              onClick={descartarRascunho}
              disabled={!podeEditar}
              className="text-[12px] font-semibold text-ink-600 underline decoration-ink-300
                         hover:text-signal-stop hover:decoration-signal-stop transition disabled:opacity-40"
            >
              Descartar
            </button>
          </div>
        )}

        {/*
         * Duas ações, duas ênfases.
         *
         * Salvar guarda o rascunho e é o gesto de quem está no meio do trabalho
         * — acontece dezenas de vezes e não muda nada para quem responde.
         * Publicar é o que coloca a pesquisa no mundo, acontece uma vez, e é o
         * único da tela que merece o azul cheio.
         *
         * 42px nos dois: é a altura do cartão de vistas ao lado — 40 dos botões
         * internos mais o filete de 1px em cima e embaixo.
         */}
        <button
          type="button"
          onClick={salvar}
          disabled={salvando || bloqueado || !podeEditar}
          className="h-[42px] px-4 rounded-ferramenta bg-ink-0 border hairline-strong text-ink-900
                     text-[13px] font-semibold
                     hover:border-vw-deep hover:text-vw-deep transition disabled:opacity-40
                     outline outline-2 outline-offset-2 outline-transparent focus-visible:outline-vw-blue"
        >
          {salvando ? "Salvando..." : salvo ? "Salvo" : "Salvar"}
        </button>

        <div className="relative">
          <button
            type="button"
            data-abre-publicacao
            onClick={() =>
              status === "ativa" && !temRascunho ? setMostrandoLink((v) => !v) : publicar()
            }
            disabled={publicando || bloqueado || !podeEditar}
            className="h-[42px] px-4 rounded-ferramenta bg-vw-deep text-ink-0
                       text-[13px] font-semibold
                       hover:opacity-90 transition disabled:opacity-40
                       outline outline-2 outline-offset-2 outline-transparent focus-visible:outline-vw-blue"
          >
            {publicando
              ? "Publicando..."
              : status !== "ativa"
                ? "Publicar"
                : temRascunho
                  ? "Publicar alterações"
                  : "No ar"}
          </button>

          {mostrandoLink && (
            <PainelPublicacao
              pesquisaId={pesquisaId}
              status={status}
              podeEditar={podeEditar}
              onMudarStatus={mudarStatus}
              onFechar={() => setMostrandoLink(false)}
            />
          )}
        </div>
      </div>

      {/* ---------- painel da direita: escolher o tipo ou editar o bloco ---------- */}
      {escolhendoTipo !== undefined && (
        <PainelTipos
          destino={escolhendoTipo}
          ancora={ancora}
          hooks={hooks}
          abertura={blocos.length === 0}
          saindo={fechandoTipos}
          onEscolher={adicionar}
          onFechar={fecharTipos}
        />
      )}

      {/* `items-start`: a faixa vai do topo ao rodapé só para dizer até onde o
          painel pode crescer — sem isso ele esticava até o fim da faixa e
          sobrava meia tela de branco abaixo do último botão. */}
      {/* A capa é o único painel largo: os outros editam campos, este escolhe
          entre imagens — e imagem pequena não se compara, só se lista. */}
      {modo === "fluxo" && escolhendoTipo === undefined && selecionado === CAPA && (
        <div className="absolute top-[4.5rem] right-4 bottom-20 z-20 w-[36rem] max-w-[calc(100vw-2rem)] flex items-start">
          <PainelCapa
            apresentacao={apresentacao}
            texto={texto}
            podeEditar={podeEditar}
            onPatch={mudarCapa}
            onPatchTexto={mudarTexto}
            onFechar={() => setSelecionado(null)}
          />
        </div>
      )}

      {modo === "fluxo" && escolhendoTipo === undefined && selecionado === CARTAO && (
        <div className="absolute top-[4.5rem] right-4 bottom-20 z-20 w-[21rem] flex items-start">
          <PainelCartao
            apresentacao={apresentacao}
            blocos={blocos}
            hooks={hooks}
            podeEditar={podeEditar}
            onPatch={mudarCapa}
            onFechar={() => setSelecionado(null)}
          />
        </div>
      )}

      {modo === "fluxo" && escolhendoTipo === undefined && blocoEmFoco && (
        <div className="absolute top-[4.5rem] right-4 bottom-20 z-20 w-[21rem] flex items-start">
          <PainelBloco
            bloco={blocoEmFoco}
            blocos={blocos}
          hooks={hooks}
            problemas={problemas.filter((p) => p.blocoId === blocoEmFoco.id)}
            podeEditar={podeEditar}
            onPatch={(patch) => mudar(atualizarBloco(blocos, blocoEmFoco.id, patch))}
            onRemover={() => {
              mudar(removerBloco(blocos, blocoEmFoco.id));
              setSelecionado(null);
            }}
            onFechar={() => setSelecionado(null)}
            onAdicionarEm={abrirTipos}
          />
        </div>
      )}

      {!podeEditar && (
        <div className="absolute bottom-5 left-4 z-20 bg-ink-0 border border-signal-warn/45 rounded-ferramenta px-3 py-2 text-[12px] text-ink-800">
          <strong>Somente leitura.</strong> {nomeUsuario} não edita pesquisas.
        </div>
      )}

      {/* ---------- folhas ---------- */}
      {folha && (
        <FolhaSobreposta
          titulo={
            folha === "regras" ? "Regras"
            : folha === "desfechos" ? "Desfechos"
            : "Simulação"
          }
          onFechar={() => setFolha(null)}
        >
          {folha === "regras" && (
            <PainelRegras
              pesquisaId={pesquisaId}
              versoes={versoes}
              versaoAtivaId={versaoAtivaId}
              desfechos={desfechos}
              podeEditar={podeEditar}
            />
          )}

          {folha === "desfechos" && (
            <PainelDesfechos
              desfechos={desfechos}
              versoes={versoes}
              podeEditar={podeEditar}
              onMudar={mudarDesfechos}
            />
          )}

          {folha === "simulacao" && (
            <SimuladorFluxo
              pesquisaId={pesquisaId}
              blocos={blocos}
              salvo={salvo}
              apresentacao={apresentacao}
              titulo={texto.chamada.trim() || configuracao.nome}
              descricao={texto.descricao}
            />
          )}

        </FolhaSobreposta>
      )}
    </div>
  );
}

/**
 * Uma vista aberta por cima do desenho.
 *
 * Escurece a prancheta em vez de substituí-la: o que se faz aqui é sobre o
 * fluxo que continua atrás, e fechar devolve ao ponto exato de onde se saiu —
 * inclusive o enquadramento do canvas, que não se perde por não haver
 * navegação.
 */
function FolhaSobreposta({
  titulo,
  onFechar,
  children,
}: {
  titulo: string;
  onFechar: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="absolute inset-0 z-30 flex items-stretch justify-center">
      <div className="absolute inset-0 bg-ink-900/25" onClick={onFechar} aria-hidden />
      {/* Larga, com teto. Em `max-w-6xl` a prévia da capa ficava do tamanho de
          um cartão; sem teto nenhum, num monitor grande ela virava uma faixa de
          três por um, que não é a proporção de tela nenhuma. 80rem fica entre
          as duas. */}
      <div className="relative m-3 lg:m-6 w-full max-w-[80rem] bg-ink-0 border hairline-strong rounded-ferramenta flex flex-col overflow-hidden">
        <div className="h-12 px-5 border-b hairline flex items-center justify-between shrink-0">
          <h2 className="text-[14px] font-semibold">{titulo}</h2>
          <button
            type="button"
            onClick={onFechar}
            className="h-8 px-3 rounded-md text-[13px] text-ink-600 hover:bg-ink-100 hover:text-ink-900 transition"
          >
            Fechar
          </button>
        </div>
        <div className="escala-ferramenta flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

/** Busca em profundidade: o bloco pode estar dentro do ramo de uma condicional. */
function acharBloco(blocos: Bloco[], id: string | null): Bloco | undefined {
  if (!id) return undefined;
  for (const b of blocos) {
    if (b.id === id) return b;
    if (b.bloco === "condicional") {
      const achado = acharBloco([...b.entao, ...b.senao], id);
      if (achado) return achado;
    }
  }
  return undefined;
}
