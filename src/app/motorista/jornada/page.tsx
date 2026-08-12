"use client";

import { MarcaCarregando } from "@/components/MarcaCarregando";
import { TelaDeDesfecho, type Tom } from "@/components/ResultadoDecisao";
import { ShellFluxo } from "@/components/ShellFluxo";
import { useTransicao } from "@/components/Transicao";
import { Button, cn, Input, Label } from "@/components/ui";
import {
  montarFatos,
  perguntasVisiveis,
  preencherTexto,
  proximoPasso,
  resolverArgumentos,
  rotularFato,
} from "@/lib/engine";
import {
  acharDesfecho,
  Bloco,
  BlocoFeedback,
  BlocoPergunta,
  Desfecho,
  Pesquisa,
  DecisaoResultado,
  ehConsulta,
  ehFeedback,
  ehPergunta,
} from "@/lib/types";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

type PesquisaLite = Pick<Pesquisa, "id" | "nome"> & { blocos: Bloco[] } & {
  /** Mensagem de carregamento de cada hook, por id. Vem do `/api/lookup`. */
  carregamentos: Record<string, string>;
  /** Rótulo de exibição por caminho de fato: `credito.temRestricao` → "Tem restrição". */
  rotulos: Record<string, string>;
  /** Identificador que a capa colheu, se colheu. Ausente quando ela só convida. */
  campoDaCapa?: string;
  /** Os fins possíveis desta pesquisa — de onde sai o texto da tela final. */
  desfechos: Desfecho[];
};

/**
 * Piso de exibição do momento de entrada.
 *
 * O valor não é arbitrário: o símbolo desenha e recolhe num ciclo de 2000ms, e o
 * escalonamento entre as três formas empurra o fim para 2280ms. O piso cobre um
 * ciclo inteiro, para a marca ser vista completa e não pela metade.
 *
 * Os hooks do exemplo leem CSV da memória e voltam em milissegundos; em
 * produção, onde o hook bate em bureau de crédito, o piso não chega a valer.
 */
const PISO_ENTRADA = 2400;

/**
 * Piso da espera pela decisão, e da saída pelo "Finalizar".
 *
 * Menor que o da chegada de propósito: aqui a marca já foi apresentada, e o que
 * a camada faz é cobrir o corte entre a última pergunta e o veredito. Ainda
 * assim precisa de um ciclo inteiro do desenho — pela metade parece travamento,
 * não espera.
 */
const PISO_DECISAO = 2000;

type Direcao = "frente" | "tras";
type Fase = "estavel" | "sai" | "entra";

const DUR_SAIDA = 170;
const DUR_ENTRADA = 260;

/**
 * Campos que já chegaram respondidos, vindos da capa.
 *
 * Era uma lista fixa com `"cpf"` dentro — o único lugar da jornada que sabia o
 * nome de um campo do caso de uso. Agora sai do que a capa mandou: se a pesquisa
 * abre por convite, nada chega pronto, o CPF é perguntado como qualquer outra
 * pergunta, e este conjunto nasce vazio sozinho.
 */
function camposDaCapa(respostasIniciais: Record<string, unknown>) {
  return new Set(Object.keys(respostasIniciais));
}

/**
 * Primeiro nome, quando algum hook trouxer um campo `nome`.
 *
 * `nome` é chave genérica de cadastro, não vocabulário de negócio — o motor
 * segue sem saber de que base ela veio. Quando nenhum hook traz, volta `null` e
 * as telas caem no texto sem saudação, que continua fazendo sentido sozinho.
 */
function primeiroNome(contexto: [string, unknown][]) {
  const achado = contexto.find(([k]) => k.split(".").pop()?.toLowerCase() === "nome");
  const inteiro = typeof achado?.[1] === "string" ? achado[1].trim() : "";
  return inteiro ? inteiro.split(/\s+/)[0] : null;
}

/**
 * Enunciado que vai virar continuação de frase depois da vírgula da saudação:
 * "Autoriza consultar..." precisa entrar como "autoriza consultar...".
 *
 * Duas maiúsculas seguidas indicam sigla ("CPF confere?") — aí a primeira letra
 * fica como está, porque baixá-la estragaria a palavra.
 */
function emMinuscula(texto: string) {
  if (/^[A-ZÀ-Ý]{2}/.test(texto)) return texto;
  return texto.charAt(0).toLowerCase() + texto.slice(1);
}

/** O caminho de volta: a frase escrita para vir depois do nome, quando não há nome. */
function emMaiuscula(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * CPF parcial. A tela final pode estar sendo vista por cima do ombro, no balcão
 * da concessionária — os dígitos do meio já bastam para a pessoa reconhecer que
 * o número é o dela, e são os que o vendedor usa para conferir.
 */
function mascararCpf(cpf: string) {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return cpf;
  return `•••.${d.slice(3, 6)}.${d.slice(6, 9)}-••`;
}

/** Silhueta de pessoa, à mão. Um contorno não justifica biblioteca de ícones. */
function IconePessoa() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden
      className="w-5 h-5 shrink-0 text-vw-deep"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
    >
      <circle cx="10" cy="6.5" r="3.2" />
      <path d="M3.8 17c0-3.4 2.8-5.6 6.2-5.6s6.2 2.2 6.2 5.6" />
    </svg>
  );
}

/** Informação, mesmo traço da silhueta — os dois convivem na tela final. */
function IconeInfo() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden
      className="w-5 h-5 shrink-0 text-signal-go mt-0.5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
    >
      <circle cx="10" cy="10" r="7.6" />
      <path d="M10 9.2v5" />
      <path d="M10 6.1v.1" />
    </svg>
  );
}

/**
 * Ação única do fim da jornada: mostra a marca e devolve para a home.
 *
 * Sem o piso, o clique levaria a um piscar navy sem significado. Com ele, a
 * saída fica sendo a mesma cena da chegada, ao contrário.
 */
function BotaoFinalizar() {
  const { irPara } = useTransicao();
  const [finalizando, setFinalizando] = useState(false);

  useEffect(() => {
    if (!finalizando) return;
    const t = setTimeout(() => irPara("/motorista"), PISO_DECISAO);
    return () => clearTimeout(t);
  }, [finalizando, irPara]);

  return (
    <>
      {/* Divisor acima da ação, como no resto da jornada. */}
      <div className="mt-10 border-t hairline pt-8">
        <Button
          className="w-full sm:w-auto"
          disabled={finalizando}
          onClick={() => setFinalizando(true)}
        >
          Finalizar
        </Button>
      </div>
      {finalizando && <MarcaCarregando mensagem="Voltando ao início" />}
    </>
  );
}

function JornadaInner() {
  const sp = useSearchParams();
  const pesquisaId = sp.get("pesquisa") ?? "";

  /*
   * O id desta submissão, criado no navegador ao abrir a jornada.
   *
   * Ele existe antes de qualquer resposta: é o que permite registrar quem
   * parou no meio. `useState` com função para nascer uma vez só — recriar a
   * cada render abriria uma submissão nova a cada tecla.
   */
  const [sessaoId] = useState(
    () => `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
  );
  const [pesquisa, setPesquisa] = useState<PesquisaLite | null>(null);
  /** Por que não veio pesquisa: fora do ar, ou endereço errado mesmo. */
  const [motivo, setMotivo] = useState<string | null>(null);
  const [respostas, setRespostas] = useState<Record<string, unknown>>({});
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [decisao, setDecisao] = useState<DecisaoResultado | null>(null);
  const [rascunho, setRascunho] = useState("");

  const [fase, setFase] = useState<Fase>("estavel");
  const [direcao, setDirecao] = useState<Direcao>("frente");

  /** Fatos trazidos pelos blocos de consulta, agrupados por prefixo da fonte. */
  const [externos, setExternos] = useState<Record<string, Record<string, unknown>>>({});
  const [consultasFeitas, setConsultasFeitas] = useState<Set<string>>(new Set());
  const [consultando, setConsultando] = useState<string | null>(null);
  /** Mensagem do hook em execução — a que o gestor escreveu naquele hook. */
  const [mensagemConsulta, setMensagemConsulta] = useState<string | null>(null);

  /** O momento de entrada acontece uma vez e não volta nas consultas seguintes. */
  const [entradaConcluida, setEntradaConcluida] = useState(false);
  const [pisoAtingido, setPisoAtingido] = useState(false);
  /**
   * Fica montada além do fim da espera: a camada precisa continuar em cena para
   * se dissolver sobre a pergunta que já apareceu por baixo.
   */
  const [entradaNoDom, setEntradaNoDom] = useState(true);
  const desmontarEntrada = useCallback(() => setEntradaNoDom(false), []);
  /**
   * Trava a mensagem do hook em vez de segui-la. O hook responde em
   * milissegundos, então acompanhar `mensagemConsulta` deixaria o texto que o
   * gestor escreveu passar num piscar e a tela voltar para a frase neutra —
   * exatamente o texto que não deveria ser visto seria o que fica.
   */
  const [mensagemEntrada, setMensagemEntrada] = useState("Preparando suas perguntas");

  /** Mesma mecânica da entrada, para a espera pela decisão. */
  const [decisaoNoDom, setDecisaoNoDom] = useState(false);
  const [pisoDecisao, setPisoDecisao] = useState(false);
  const desmontarDecisao = useCallback(() => setDecisaoNoDom(false), []);

  /**
   * Navegação pela régua. `null` = fluxo normal, mostrando a primeira sem
   * resposta. Com número, a pessoa pediu para ver aquele passo.
   *
   * `maxAlcancado` é monotônico de propósito: voltar não pode apagar o direito
   * de avançar de novo até onde já se chegou. Sem ele, o segmento à frente
   * ficaria travado e a pessoa ficaria presa no passado.
   */
  const [indiceManual, setIndiceManual] = useState<number | null>(null);
  const [maxAlcancado, setMaxAlcancado] = useState(0);

  const jaDecidiu = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const atuais = timers.current;
    return () => atuais.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setPisoAtingido(true), PISO_ENTRADA);
    return () => clearTimeout(t);
  }, []);

  /*
   * O que a capa já respondeu.
   *
   * Qual campo ela colheu vem da própria pesquisa, não de um nome combinado
   * aqui: o parâmetro da URL leva o identificador configurado no cartão. Vazio
   * quando a capa só convida — e aí tudo é perguntado na jornada.
   */
  const [respostasDaCapa, setRespostasDaCapa] = useState<Record<string, unknown>>({});
  const automaticos = useMemo(() => camposDaCapa(respostasDaCapa), [respostasDaCapa]);

  /*
   * Quem é a pessoa, para a sessão.
   *
   * `cpf` como nome da chave é dívida conhecida: a sessão é indexada por ele em
   * `/api/decidir` e no store. O valor, porém, já é agnóstico — é o que a capa
   * colheu, ou a resposta correspondente dentro da jornada.
   */
  const identificador = useMemo(() => {
    const campo = pesquisa?.campoDaCapa ?? "cpf";
    const v = respostas[campo] ?? respostasDaCapa[campo];
    return typeof v === "string" ? v : "";
  }, [pesquisa, respostas, respostasDaCapa]);

  useEffect(() => {
    let vivo = true;
    /* A prévia atravessa a jornada inteira: quem está conferindo antes de
       publicar não deveria esbarrar na trava no segundo passo. */
    const previa = sp.get("previa") === "1" ? "&previa=1" : "";
    fetch(`/api/lookup?pesquisa=${encodeURIComponent(pesquisaId)}${previa}`)
      .then((r) => r.json())
      .then((json) => {
        if (!vivo) return;
        const p: PesquisaLite | null = json.pesquisa ?? null;
        setPesquisa(p);
        setMotivo(p ? null : (json.erro ?? null));
        const campo = p?.campoDaCapa;
        const daCapa = campo && sp.get(campo) ? { [campo]: sp.get(campo) as string } : {};
        setRespostasDaCapa(daCapa);
        setRespostas(daCapa);
        setCarregando(false);
      });
    return () => { vivo = false; };
  }, [pesquisaId, sp]);

  const fatos = useMemo(
    () => montarFatos(respostas, externos),
    [respostas, externos],
  );

  /*
   * Registra o percurso enquanto ele acontece.
   *
   * Roda ao abrir e a cada resposta ou consulta. Sem `await` e sem bloquear a
   * tela: o registro é para quem olha depois, e uma falha aqui não pode
   * atrapalhar quem está respondendo. Por isso o `catch` vazio — a submissão
   * fica incompleta, a pessoa continua.
   */
  useEffect(() => {
    if (!pesquisa || carregando) return;
    fetch("/api/sessao", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        pesquisaId,
        sessaoId,
        identificador,
        respostas,
        externos,
      }),
    }).catch(() => {});
  }, [pesquisa, carregando, pesquisaId, sessaoId, identificador, respostas, externos]);

  /** Pode ser uma pergunta a fazer ou uma consulta a disparar. */
  const passo = useMemo(() => {
    if (!pesquisa) return null;
    return proximoPasso(pesquisa.blocos, fatos, consultasFeitas);
  }, [pesquisa, fatos, consultasFeitas]);

  /**
   * Campos legíveis trazidos pelos hooks. A chave carrega o prefixo
   * (`uber.cidade`) porque é ele que casa com o rótulo que o hook declarou — sem
   * o prefixo, dois hooks com um campo de mesmo nome trocariam de rótulo.
   */
  const contextoConhecido = useMemo(
    () =>
      Object.entries(externos)
        .filter(([, f]) => f?.encontrado === true)
        .flatMap(([prefixo, f]) =>
          Object.entries(f)
            .filter(([k]) => k !== "encontrado" && k !== "erro")
            .map(([k, v]) => [`${prefixo}.${k}`, v] as [string, unknown]),
        )
        .slice(0, 6),
    [externos],
  );

  const pergunta = passo && ehPergunta(passo) ? passo : null;
  /** Tela final configurada pelo autor da pesquisa; substitui o resultado padrão. */
  const telaFinal = passo && ehFeedback(passo) ? passo : null;

  const visiveis = useMemo(
    () => (pesquisa ? perguntasVisiveis(pesquisa.blocos, fatos) : []),
    [pesquisa, fatos],
  );

  const respondida = useCallback(
    (p: BlocoPergunta) => {
      const v = respostas[p.campo];
      return v !== undefined && v !== null && v !== "";
    },
    [respostas],
  );

  const progresso = useMemo(() => {
    const feitas = visiveis.filter(respondida).length;
    return { feitas, total: visiveis.length };
  }, [visiveis, respondida]);

  useEffect(() => {
    setMaxAlcancado((m) => Math.max(m, progresso.feitas));
  }, [progresso.feitas]);

  /**
   * Pergunta em cena: a que a régua pediu, se pediu alguma, senão a do fluxo.
   * Uma resposta anterior pode fechar o ramo onde o índice estava, então ele é
   * validado contra a lista visível de agora, e não contra a de quando o clique
   * aconteceu.
   */
  const perguntaExibida = indiceManual !== null ? (visiveis[indiceManual] ?? null) : null;

  /**
   * Saudação pelo nome, e só na primeira pergunta que a pessoa responde.
   *
   * Repetir o nome a cada passo transforma cortesia em tique — a partir da
   * segunda tela ele não informa mais nada. Aqui ele faz trabalho: é a prova de
   * que a consulta achou quem devia achar, dita na primeira frase.
   */
  const saudacao = useMemo(() => {
    const primeiraDaPessoa = visiveis.findIndex((p) => !automaticos.has(p.campo));
    if (primeiraDaPessoa < 0) return null;
    if ((indiceManual ?? progresso.feitas) !== primeiraDaPessoa) return null;
    return primeiroNome(contextoConhecido);
  }, [visiveis, indiceManual, progresso.feitas, contextoConhecido, automaticos]);

  /** Pergunta imediatamente anterior à que está em cena, se houver e se for da pessoa. */
  const alvoDoVoltar = useMemo(() => {
    const anterior = visiveis[(indiceManual ?? progresso.feitas) - 1];
    return anterior && !automaticos.has(anterior.campo) ? anterior : null;
  }, [visiveis, indiceManual, progresso.feitas, automaticos]);

  /** Anima a saída, aplica a mudança, anima a entrada. */
  const transicionar = useCallback((dir: Direcao, mutar: () => void) => {
    setDirecao(dir);
    setFase("sai");
    timers.current.push(
      setTimeout(() => {
        mutar();
        setFase("entra");
        timers.current.push(setTimeout(() => setFase("estavel"), DUR_ENTRADA));
      }, DUR_SAIDA),
    );
  }, []);

  function responder(campo: string, valor: unknown) {
    transicionar("frente", () => {
      setRespostas((r) => ({ ...r, [campo]: valor }));
      setRascunho("");
      // Responder devolve ao fluxo: daqui ele reencontra a primeira sem resposta.
      setIndiceManual(null);
    });
  }

  /** Salto pela régua. Só até onde já se chegou — não é atalho para o futuro. */
  function irParaPasso(indice: number) {
    if (indice > maxAlcancado || indice >= visiveis.length) return;
    const atual = indiceManual ?? progresso.feitas;
    if (indice === atual) return;
    transicionar(indice < atual ? "tras" : "frente", () => {
      setIndiceManual(indice);
      setRascunho("");
    });
  }

  /**
   * Voltar agora navega, não apaga.
   *
   * Enquanto ele removia a última resposta, voltar custava o que já tinha sido
   * respondido — e com a régua permitindo ir e vir isso viraria perda de dado a
   * cada clique. A resposta anterior fica e reaparece quando a pessoa volta.
   */
  function voltar() {
    irParaPasso((indiceManual ?? progresso.feitas) - 1);
  }

  /** Gatilho de busca: o fluxo parou numa consulta, então puxa o dado. */
  useEffect(() => {
    if (!pesquisa || carregando || decisao) return;
    if (!passo || !ehConsulta(passo)) return;
    if (consultando === passo.id) return;

    const alvo = passo;
    setConsultando(alvo.id);
    setMensagemConsulta(pesquisa.carregamentos?.[alvo.hookId] ?? null);
    fetch("/api/executar-hook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        pesquisaId,
        hookId: alvo.hookId,
        argumentos: resolverArgumentos(alvo, respostas),
      }),
    })
      .then((r) => r.json())
      .then((json) => {
        // Mesmo sem achar registro, marcamos a consulta como feita — senão o
        // fluxo trava tentando de novo para sempre.
        setExternos((e) => ({ ...e, [json.prefixo ?? "externo"]: json.fatos ?? { encontrado: false } }));
        setConsultasFeitas((s) => new Set(s).add(alvo.id));
        setConsultando(null);
        setMensagemConsulta(null);
      })
      .catch(() => {
        setExternos((e) => ({ ...e, erro: { falhou: true } }));
        setConsultasFeitas((s) => new Set(s).add(alvo.id));
        setConsultando(null);
        setMensagemConsulta(null);
      });
  }, [passo, pesquisa, carregando, decisao, pesquisaId, respostas, consultando]);

  /**
   * A entrada cobre da chegada até o primeiro hook terminar — é uma cena só, e
   * as consultas do meio da jornada não a trazem de volta.
   */
  const mostrarEntrada =
    !entradaConcluida && (carregando || consultando !== null || !pisoAtingido);

  useEffect(() => {
    if (!carregando && consultando === null && pisoAtingido) setEntradaConcluida(true);
  }, [carregando, consultando, pisoAtingido]);

  useEffect(() => {
    if (mensagemConsulta) setMensagemEntrada(mensagemConsulta);
  }, [mensagemConsulta]);

  useEffect(() => {
    if (!pesquisa || carregando || decisao || jaDecidiu.current) return;
    // Só decide quando a animação terminou — evita o card sumir no meio do movimento.
    if ((passo === null || ehFeedback(passo)) && fase === "estavel") {
      jaDecidiu.current = true;
      setEnviando(true);
      fetch("/api/decidir", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pesquisaId, sessaoId, cpf: identificador, respostas, externos }),
      })
        .then((r) => r.json())
        .then((json) => {
          setDecisao(json.decisao ?? null);
          setEnviando(false);
        });
    }
  }, [passo, pesquisa, carregando, decisao, pesquisaId, sessaoId, identificador, respostas, fase, externos]);

  /**
   * A entrada não é `return` antecipado: ela fica por cima, como camada fixa.
   * Assim a primeira pergunta já está montada por baixo quando a marca se
   * dissolve — enquanto era `return`, o loader saía para uma tela vazia e a
   * pergunta entrava em corte seco.
   */
  const entrada = entradaNoDom ? (
    <MarcaCarregando
      mensagem={mensagemEntrada}
      saindo={!mostrarEntrada}
      aoSair={desmontarEntrada}
    />
  ) : null;

  /**
   * Segundo momento de marca: entre a última resposta e o veredito.
   *
   * A decisão volta em milissegundos, e sem esta camada a última pergunta
   * simplesmente virava a tela de resultado — corte seco no ponto mais
   * importante da jornada. A camada cobre a troca e devolve à resposta o peso
   * de resposta.
   */
  /*
   * `passo === null` e não `!pergunta`: um bloco de consulta no meio do caminho
   * também deixa a pergunta nula, e por `!pergunta` a camada subia no meio do
   * fluxo e travava lá — esperando um veredito que ainda tinha três perguntas
   * pela frente.
   */
  const emDecisao =
    !!pesquisa && !carregando && entradaConcluida && (passo === null || !!telaFinal);

  useEffect(() => {
    if (!emDecisao) return;
    setDecisaoNoDom(true);
    const t = setTimeout(() => setPisoDecisao(true), PISO_DECISAO);
    return () => clearTimeout(t);
  }, [emDecisao]);

  const saida = decisaoNoDom ? (
    <MarcaCarregando
      // Nomear a pesquisa aqui era jargão de gestor vazando para quem responde. O que
      // interessa dizer aqui é que quem decide é uma regra, não uma pessoa.
      mensagem="Aplicando as regras"
      // A tela final desenhada pelo autor não espera a API — ela já está pronta
      // assim que o fluxo chega nela, e só o piso da marca a segura.
      saindo={pisoDecisao && (!!decisao || !!telaFinal)}
      aoSair={desmontarDecisao}
    />
  ) : null;

  if (!pesquisa) {
    /* Fora do ar não é "não encontrada": quem recebeu o link não errou o
       endereço, e a diferença é a única coisa que essa pessoa precisa saber. */
    const foraDoAr = motivo === "pesquisa_fora_do_ar";
    return (
      <>
        <ShellFluxo
          area={{ label: "Motorista", href: "/motorista" }}
          largura="estreita"
          title={foraDoAr ? "Esta pesquisa não está no ar" : "Pesquisa não encontrada"}
        >
          {foraDoAr && (
            <p className="text-lg text-ink-700 mb-6 max-w-xl">
              Ela não está recebendo respostas agora. Se você recebeu o link de alguém da
              Volkswagen, vale confirmar com quem enviou.
            </p>
          )}
          <Link href="/motorista" className="underline">Voltar</Link>
        </ShellFluxo>
        {entrada}
      </>
    );
  }

  // A tela final configurada pelo autor tem precedência sobre o resultado
  // padrão. Ela aparece já; a decisão segue sendo gravada em segundo plano.
  if (telaFinal) {
    return (
      <>
        <TelaFinal bloco={telaFinal} pesquisa={pesquisa} contexto={contextoConhecido} />
        {entrada}
        {saida}
      </>
    );
  }

  if (decisao) {
    return (
      <>
        <Resultado
          decisao={decisao}
          contexto={contextoConhecido}
          pesquisa={pesquisa}
          cpf={identificador}
        />
        {entrada}
        {saida}
      </>
    );
  }

  const classeAnimacao =
    fase === "sai" ? `passo-sai-${direcao}` : fase === "entra" ? `passo-entra-${direcao}` : "";

  return (
    <>
    <ShellFluxo area={{ label: "Motorista", href: "/motorista" }} largura="estreita" rodapeColado>
      {/*
        * Progresso em segmentos, um por passo — a figura de story: dá para
        * contar quantos faltam de relance, sem número escrito.
        *
        * Sem nome de pesquisa e sem porcentagem embaixo: eram duas linhas de
        * texto para dizer o que a própria régua já diz.
        */}
      <div
        className="entra mb-6 flex gap-1.5"
        role="group"
        aria-label={`Passo ${(indiceManual ?? progresso.feitas) + 1} de ${progresso.total}`}
      >
        {Array.from({ length: progresso.total }, (_, i) => {
          const atual = i === (indiceManual ?? progresso.feitas);
          const alcancavel = i <= maxAlcancado;
          return (
            <button
              key={i}
              type="button"
              onClick={() => irParaPasso(i)}
              disabled={!alcancavel || fase !== "estavel"}
              aria-label={`Ir para o passo ${i + 1}`}
              aria-current={atual ? "step" : undefined}
              /* Alvo de toque de 44px com o traço fino dentro: a régua tem 4px
                 de altura, e 4px é impossível de acertar com o dedo. */
              className="flex-1 h-11 flex items-center group disabled:cursor-not-allowed"
            >
              <span
                className={cn(
                  "block w-full h-1 rounded-full transition-colors duration-300 motion-reduce:transition-none",
                  atual
                    ? "bg-vw-blue"
                    : i < progresso.feitas
                      ? "bg-vw-deep group-hover:bg-vw-blue"
                      : "bg-ink-200",
                )}
              />
            </button>
          );
        })}
      </div>

      {/* Contexto já conhecido — o "perguntar menos" visível.
          Vem dos hooks, não de nenhuma base que o código conheça. */}
      {contextoConhecido.length > 0 && (
        <CartaoPerfil dados={contextoConhecido} rotulos={pesquisa.rotulos ?? {}} />
      )}

      <div className={classeAnimacao}>
        {(perguntaExibida ?? pergunta) && (
          <PerguntaPasso
            key={(perguntaExibida ?? pergunta)!.id}
            pergunta={(perguntaExibida ?? pergunta)!}
            saudacao={saudacao}
            rascunho={rascunho}
            setRascunho={setRascunho}
            onResponder={responder}
          />
        )}
        {!pergunta && enviando && (
          <p className="text-base text-ink-600">Aplicando regras da pesquisa...</p>
        )}
      </div>

      {alvoDoVoltar && (perguntaExibida ?? pergunta) && (
        <button
          type="button"
          onClick={voltar}
          disabled={fase !== "estavel"}
          className="mt-8 text-sm text-ink-600 hover:text-ink-900 transition disabled:opacity-40"
        >
          ← Voltar para &ldquo;{alvoDoVoltar.rotulo}&rdquo;
        </button>
      )}
    </ShellFluxo>
    {entrada}
    {saida}
    </>
  );
}

/**
 * Um passo = uma pergunta. Sem moldura de card: o enunciado é o elemento
 * mais forte da tela e as opções ficam logo abaixo, com bastante ar.
 */
function PerguntaPasso({
  pergunta,
  saudacao,
  rascunho,
  setRascunho,
  onResponder,
}: {
  pergunta: BlocoPergunta;
  /** Primeiro nome, quando esta é a pergunta que abre a conversa. */
  saudacao?: string | null;
  rascunho: string;
  setRascunho: (v: string) => void;
  onResponder: (campo: string, valor: unknown) => void;
}) {
  const textual = ["texto", "email", "telefone", "cpf", "numero"].includes(pergunta.tipo);

  /**
   * Teclado do celular por tipo de pergunta. `inputMode` é o que decide qual
   * teclado abre; `type` sozinho não resolve, e `type="number"` traz setinha de
   * incremento e recusa zero à esquerda — inútil para CPF e telefone, que são
   * sequências de dígitos e não quantidades.
   */
  const teclado: Partial<
    Record<BlocoPergunta["tipo"], { type: string; inputMode: "numeric" | "tel" | "email" | "text"; autoComplete?: string }>
  > = {
    cpf: { type: "text", inputMode: "numeric", autoComplete: "off" },
    telefone: { type: "tel", inputMode: "tel", autoComplete: "tel" },
    numero: { type: "text", inputMode: "numeric" },
    email: { type: "email", inputMode: "email", autoComplete: "email" },
  };
  const entrada = teclado[pergunta.tipo] ?? { type: "text", inputMode: "text" as const };

  return (
    // Sem altura mínima: ela reservava 46svh e sobrava espaço vazio embaixo,
    // forçando rolagem numa tela que cabe inteira. A altura vira a do conteúdo.
    <div>
      <h2 className="entra display text-2xl md:text-3xl">
        {saudacao ? `${saudacao}, ${emMinuscula(pergunta.rotulo)}` : pergunta.rotulo}
      </h2>
      {pergunta.ajuda && (
        <p
          className="entra text-base text-ink-600 mt-4 max-w-lg"
          style={{ animationDelay: "70ms" }}
        >
          {pergunta.ajuda}
        </p>
      )}

      {/* Divisor a 24px do enunciado; a resposta vem 24px depois dele. */}
      <hr className="entra border-0 border-t hairline mt-6" style={{ animationDelay: "110ms" }} />

      <div className="entra mt-6" style={{ animationDelay: "150ms" }}>
        {pergunta.tipo === "consentimento" && (
          /*
           * Empilhado e de ponta a ponta no celular; lado a lado e alinhado à
           * esquerda no desktop.
           *
           * Vem da pesquisa, não de gosto: no celular o alvo cheio é mais fácil
           * de acertar e fica na faixa do polegar, e a NN/g é explícita em pedir
           * peso visual menor para a ação secundária — daí o vazado ao lado do
           * preenchido. No desktop, alinhado à esquerda porque é a borda que o
           * olho já está seguindo desde o enunciado; primário à direita obrigaria
           * a atravessar a coluna para achá-lo.
           */
          <div className="flex flex-col sm:flex-row gap-3">
            <Button className="w-full sm:w-auto" onClick={() => onResponder(pergunta.campo, true)}>
              Autorizo
            </Button>
            <Button
              variant="recusa"
              className="w-full sm:w-auto"
              onClick={() => onResponder(pergunta.campo, false)}
            >
              Não autorizo
            </Button>
          </div>
        )}

        {(pergunta.tipo === "opcao" || pergunta.tipo === "multipla") && (
          <div className="grid gap-2">
            {(pergunta.opcoes ?? []).map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => onResponder(pergunta.campo, o)}
                className="group flex items-center justify-between gap-4 text-left border hairline bg-ink-0
                           hover:border-vw-deep hover:bg-ink-50 px-5 py-4 rounded-md text-base transition
                           min-h-[3rem]"
              >
                <span>{o}</span>
                <span className="text-ink-600 group-hover:text-vw-deep transition">→</span>
              </button>
            ))}
          </div>
        )}

        {textual && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!rascunho.trim()) return;
              onResponder(pergunta.campo, rascunho.trim());
            }}
          >
            <Label htmlFor="resp">Sua resposta</Label>
            <Input
              id="resp"
              autoFocus
              type={entrada.type}
              inputMode={entrada.inputMode}
              autoComplete={entrada.autoComplete}
              value={rascunho}
              onChange={(e) => setRascunho(e.target.value)}
              required={pergunta.obrigatoria}
            />
            <Button type="submit" className="mt-5 w-full sm:w-auto">
              Continuar
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}


/**
 * Perfil trazido pelos hooks.
 *
 * **Sempre recolhido**, em qualquer passo. Ele já chegou a abrir sozinho na
 * primeira pergunta, como prova de que o sistema sabia quem a pessoa era — mas
 * seis campos abertos empurram a pergunta para baixo, e a primeira tela é
 * justamente a que menos pode empurrar. O título fechado já dá o recado, e quem
 * quiser conferir abre.
 */
function CartaoPerfil({
  dados,
  rotulos,
}: {
  dados: [string, unknown][];
  rotulos: Record<string, string>;
}) {
  const [aberto, setAberto] = useState(false);
  const idConteudo = useId();

  return (
    <div className="entra mb-6 border hairline rounded-md bg-ink-50" style={{ animationDelay: "70ms" }}>
      <button
        type="button"
        aria-expanded={aberto}
        aria-controls={idConteudo}
        onClick={() => setAberto((a) => !a)}
        className="w-full flex items-center gap-2.5 px-5 py-4 text-left rounded-md
                   outline outline-2 outline-offset-2 outline-transparent focus-visible:outline-vw-blue"
      >
        <IconePessoa />
        <span className="text-sm font-semibold text-ink-900 flex-1">Já sabemos sobre você</span>
        {/* "6 dados" descrevia o conteúdo; "Expandir" diz o que o clique faz,
            que é o que se espera de um controle. */}
        <span className="text-xs text-ink-600">{aberto ? "Recolher" : "Expandir"}</span>
        <Chevron aberto={aberto} />
      </button>

      {aberto && (
        <dl id={idConteudo} className="px-5 pb-5 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
          {dados.map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-xs font-semibold text-ink-800">{rotularFato(k, rotulos)}</dt>
              <dd className="text-sm text-ink-600 mono truncate">{String(v)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function Chevron({ aberto }: { aberto: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={cn(
        "w-4 h-4 shrink-0 text-ink-600 transition-transform duration-200 motion-reduce:transition-none",
        aberto && "rotate-180",
      )}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

/**
 * Fim de caminho desenhado pelo autor da pesquisa.
 *
 * Abre igual ao resultado do motor: cartão da pesquisa primeiro, veredito
 * depois. São as duas telas finais possíveis da mesma jornada, e chegar numa ou
 * na outra depende de um detalhe do fluxo que quem responde não conhece — não
 * faz sentido que pareçam telas de produtos diferentes.
 */
function TelaFinal({
  bloco,
  pesquisa,
  contexto,
}: {
  bloco: BlocoFeedback;
  pesquisa: PesquisaLite;
  /** Fatos legíveis trazidos pelos hooks até aqui — de onde saem os números. */
  contexto: [string, unknown][];
}) {
  /*
   * O filete colorido saiu. Ele carregava a cor do tipo de feedback e era a
   * única coisa a fazê-lo; o selo agora diz o mesmo, com forma além de cor —
   * o que também tira a tela da dependência de distinguir laranja de vermelho.
   */
  const tom: Tom = ({ sucesso: "go", info: "neutro", warning: "espera", error: "stop" } as const)[
    bloco.tipo
  ];

  return (
    <ShellFluxo area={{ label: "Motorista", href: "/motorista" }} largura="estreita" rodapeColado>
      <div className="passo-entra-frente">
        <TelaDeDesfecho
          nomeDaPesquisa={pesquisa.nome}
          tom={tom}
          titulo={bloco.titulo}
          texto={bloco.mensagem}
          imagemUrl={bloco.imagemUrl}
          numeros={bloco.mostrarNumeros ? numerosDe(contexto) : []}
          rotulos={pesquisa.rotulos ?? {}}
          proximoPasso={bloco.proximoPasso}
        />

        <BotaoFinalizar />
      </div>
    </ShellFluxo>
  );
}

/** Os fatos numéricos do contexto, que é o que os cartões de número mostram. */
function numerosDe(contexto: [string, unknown][]) {
  return contexto.filter(([, v]) => typeof v === "number").slice(0, 3);
}

function Resultado({
  decisao,
  contexto,
  pesquisa,
  cpf,
}: {
  decisao: DecisaoResultado;
  contexto: [string, unknown][];
  pesquisa: PesquisaLite;
  cpf: string;
}) {
  /* Números trazidos pelos hooks — quaisquer que sejam. O motor não sabe que
     são meses e corridas, e não precisa saber para exibi-los. */
  const numeros = numerosDe(contexto);

  /*
   * O texto do desfecho sai do dado da pesquisa.
   *
   * Era um objeto aqui dentro, com uma entrada por tipo de resultado — cinco
   * telas escritas em código, todas falando de concessionária e elegibilidade.
   * Uma pesquisa de satisfação chegava ao fim e lia "você está elegível!".
   *
   * O veredito é o único texto colorido da tela, e isso segue sendo exceção
   * declarada à regra de título sempre navy: ele deixou de ser o h1 e virou a
   * legenda do cartão da pesquisa, então a cor faz o trabalho que a hierarquia
   * de tamanho não faz mais.
   */
  const desfecho = acharDesfecho(pesquisa.desfechos, decisao.tipo);
  const trocas = { nome: primeiroNome(contexto), identificador: mascararCpf(cpf) };

  return (
    <ShellFluxo area={{ label: "Motorista", href: "/motorista" }} largura="estreita" rodapeColado>
      <div className="passo-entra-frente">
        {/* Mesmo modelo do bloco de tela final: o desenho é um só, e o que
            muda é de onde vem o texto — aqui, do desfecho da pesquisa. */}
        <TelaDeDesfecho
          nomeDaPesquisa={pesquisa.nome}
          tom={desfecho.tom}
          titulo={preencherTexto(desfecho.titulo, trocas)}
          texto={desfecho.texto ? preencherTexto(desfecho.texto, trocas) : undefined}
          motivo={decisao.motivo}
          numeros={numeros}
          rotulos={pesquisa.rotulos ?? {}}
          proximoPasso={
            desfecho.proximoPasso && {
              titulo: desfecho.proximoPasso.titulo,
              texto: preencherTexto(desfecho.proximoPasso.texto, trocas),
            }
          }
        />

        {/* Uma ação só: não há segunda decisão a tomar aqui, e "ver como o
            vendedor enxerga" era porta de bastidor aberta para quem responde.
            Saiu também a linha de RuleSet e regra aplicada — é rastro de motor,
            e quem responde não tem o que fazer com ele. O vendedor e o gestor
            veem isso nas telas deles. */}
        <BotaoFinalizar />
      </div>
    </ShellFluxo>
  );
}

export default function Jornada() {
  return (
    <Suspense
      fallback={
        <ShellFluxo area={{ label: "Motorista", href: "/motorista" }} largura="estreita" rodapeColado>
          <div />
        </ShellFluxo>
      }
    >
      <JornadaInner />
    </Suspense>
  );
}
