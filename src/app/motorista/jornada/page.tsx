"use client";

import { ShellFluxo } from "@/components/ShellFluxo";
import { Badge, Button, Input, Label } from "@/components/ui";
import { montarFatos, perguntasVisiveis, proximoPasso, resolverArgumentos } from "@/lib/engine";
import {
  BlocoFeedback,
  BlocoPergunta,
  Campanha,
  COR_FEEDBACK,
  DecisaoResultado,
  ehConsulta,
  ehFeedback,
  ehPergunta,
} from "@/lib/types";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";

type CampanhaLite = Pick<Campanha, "id" | "nome" | "modelos" | "concessionaria" | "blocos">;

type Direcao = "frente" | "tras";
type Fase = "estavel" | "sai" | "entra";

const DUR_SAIDA = 170;
const DUR_ENTRADA = 260;

/** Campos preenchidos pelo sistema — não voltamos para eles. */
const AUTOMATICOS = new Set(["cpf"]);

function JornadaInner() {
  const sp = useSearchParams();
  const cpf = sp.get("cpf") ?? "";
  const campanhaId = sp.get("campanha") ?? "";

  const [campanha, setCampanha] = useState<CampanhaLite | null>(null);
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

  const jaDecidiu = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const atuais = timers.current;
    return () => atuais.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    let vivo = true;
    fetch(`/api/lookup?cpf=${encodeURIComponent(cpf)}&campanha=${encodeURIComponent(campanhaId)}`)
      .then((r) => r.json())
      .then((json) => {
        if (!vivo) return;
        setCampanha(json.campanha ?? null);
        setRespostas({ cpf });
        setCarregando(false);
      });
    return () => { vivo = false; };
  }, [cpf, campanhaId]);

  const fatos = useMemo(
    () => montarFatos(respostas, externos),
    [respostas, externos],
  );

  /** Pode ser uma pergunta a fazer ou uma consulta a disparar. */
  const passo = useMemo(() => {
    if (!campanha) return null;
    return proximoPasso(campanha.blocos, fatos, consultasFeitas);
  }, [campanha, fatos, consultasFeitas]);

  /** Campos legíveis trazidos pelos hooks — sem saber de que fonte vieram. */
  const contextoConhecido = useMemo(
    () =>
      Object.values(externos)
        .filter((f) => f?.encontrado === true)
        .flatMap((f) => Object.entries(f).filter(([k]) => k !== "encontrado" && k !== "erro"))
        .slice(0, 6),
    [externos],
  );

  const pergunta = passo && ehPergunta(passo) ? passo : null;
  /** Tela final configurada pelo autor da pesquisa; substitui o resultado padrão. */
  const telaFinal = passo && ehFeedback(passo) ? passo : null;

  const visiveis = useMemo(
    () => (campanha ? perguntasVisiveis(campanha.blocos, fatos) : []),
    [campanha, fatos],
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

  /** Última pergunta respondida que não foi preenchida pelo sistema. */
  const alvoDoVoltar = useMemo(
    () =>
      [...visiveis]
        .filter((p) => respondida(p) && !AUTOMATICOS.has(p.campo))
        .pop() ?? null,
    [visiveis, respondida],
  );

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
    });
  }

  function voltar() {
    if (!alvoDoVoltar) return;
    transicionar("tras", () => {
      setRespostas((r) => {
        const copia = { ...r };
        delete copia[alvoDoVoltar.campo];
        return copia;
      });
      setRascunho("");
    });
  }

  /** Gatilho de busca: o fluxo parou numa consulta, então puxa o dado. */
  useEffect(() => {
    if (!campanha || carregando || decisao) return;
    if (!passo || !ehConsulta(passo)) return;
    if (consultando === passo.id) return;

    const alvo = passo;
    setConsultando(alvo.id);
    fetch("/api/executar-hook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        campanhaId,
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
      })
      .catch(() => {
        setExternos((e) => ({ ...e, erro: { falhou: true } }));
        setConsultasFeitas((s) => new Set(s).add(alvo.id));
        setConsultando(null);
      });
  }, [passo, campanha, carregando, decisao, campanhaId, respostas, consultando]);

  useEffect(() => {
    if (!campanha || carregando || decisao || jaDecidiu.current) return;
    // Só decide quando a animação terminou — evita o card sumir no meio do movimento.
    if ((passo === null || ehFeedback(passo)) && fase === "estavel") {
      jaDecidiu.current = true;
      setEnviando(true);
      fetch("/api/decidir", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ campanhaId, cpf, respostas, externos }),
      })
        .then((r) => r.json())
        .then((json) => {
          setDecisao(json.decisao ?? null);
          setEnviando(false);
        });
    }
  }, [passo, campanha, carregando, decisao, campanhaId, cpf, respostas, fase, externos]);

  if (carregando) {
    return (
      <ShellFluxo area={{ label: "Motorista", href: "/motorista" }} largura="estreita">
        <div className="text-ink-600">Carregando pesquisa...</div>
      </ShellFluxo>
    );
  }

  if (!campanha) {
    return (
      <ShellFluxo
        area={{ label: "Motorista", href: "/motorista" }}
        largura="estreita"
        title="Campanha não encontrada"
      >
        <Link href="/motorista" className="underline">Voltar</Link>
      </ShellFluxo>
    );
  }

  // A tela final configurada pelo autor tem precedência sobre o resultado
  // padrão. Ela aparece já; a decisão segue sendo gravada em segundo plano.
  if (telaFinal) {
    return <TelaFinal bloco={telaFinal} decisao={decisao} campanha={campanha} cpf={cpf} />;
  }

  if (decisao) {
    return <Resultado decisao={decisao} contexto={contextoConhecido} campanha={campanha} cpf={cpf} />;
  }

  const classeAnimacao =
    fase === "sai" ? `passo-sai-${direcao}` : fase === "entra" ? `passo-entra-${direcao}` : "";

  return (
    <ShellFluxo area={{ label: "Motorista", href: "/motorista" }} largura="estreita">
      {/* Progresso: traço fino, sem número gritando na tela */}
      <div className="mb-12">
        <div className="h-0.5 bg-ink-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-vw-deep transition-all duration-300 ease-out"
            style={{
              width: `${progresso.total ? (progresso.feitas / progresso.total) * 100 : 0}%`,
            }}
          />
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs uppercase tracking-widest text-ink-600">
            {campanha.nome}
          </span>
          <span className="text-xs uppercase tracking-widest text-ink-600 mono">
            {progresso.feitas}/{progresso.total}
          </span>
        </div>
      </div>

      {/* Contexto já conhecido — o "perguntar menos" visível.
          Vem dos hooks, não de nenhuma base que o código conheça. */}
      {contextoConhecido.length > 0 && (
        <div className="mb-12">
          <div className="text-xs uppercase tracking-widest text-ink-600 mb-3">
            Já sabemos sobre você
          </div>
          <div className="flex flex-wrap gap-x-7 gap-y-1.5 text-sm text-ink-700">
            {contextoConhecido.map(([k, v]) => (
              <span key={k}>
                <span className="text-ink-600">{k}</span> {String(v)}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className={classeAnimacao}>
        {pergunta && (
          <PerguntaPasso
            key={pergunta.id}
            pergunta={pergunta}
            rascunho={rascunho}
            setRascunho={setRascunho}
            onResponder={responder}
          />
        )}
        {!pergunta && enviando && (
          <p className="text-base text-ink-600">Aplicando regras da campanha...</p>
        )}
      </div>

      {alvoDoVoltar && pergunta && (
        <button
          type="button"
          onClick={voltar}
          disabled={fase !== "estavel"}
          className="mt-10 text-sm text-ink-600 hover:text-ink-900 transition disabled:opacity-40"
        >
          ← Voltar para &ldquo;{alvoDoVoltar.rotulo}&rdquo;
        </button>
      )}
    </ShellFluxo>
  );
}

/**
 * Um passo = uma pergunta. Sem moldura de card: o enunciado é o elemento
 * mais forte da tela e as opções ficam logo abaixo, com bastante ar.
 */
function PerguntaPasso({
  pergunta,
  rascunho,
  setRascunho,
  onResponder,
}: {
  pergunta: BlocoPergunta;
  rascunho: string;
  setRascunho: (v: string) => void;
  onResponder: (campo: string, valor: unknown) => void;
}) {
  const textual = ["texto", "email", "telefone", "cpf"].includes(pergunta.tipo);

  return (
    <div>
      <h2 className="display text-2xl md:text-3xl">{pergunta.rotulo}</h2>
      {pergunta.ajuda && (
        <p className="text-base text-ink-600 mt-4 max-w-lg">{pergunta.ajuda}</p>
      )}

      <div className="mt-10">
        {pergunta.tipo === "consentimento" && (
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => onResponder(pergunta.campo, true)}>Autorizo</Button>
            <Button variant="secondary" onClick={() => onResponder(pergunta.campo, false)}>
              Não autorizo
            </Button>
          </div>
        )}

        {(pergunta.tipo === "opcao" || pergunta.tipo === "multipla") && (
          <div className="grid gap-2.5">
            {(pergunta.opcoes ?? []).map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => onResponder(pergunta.campo, o)}
                className="group flex items-center justify-between gap-4 text-left border hairline bg-ink-0
                           hover:border-vw-deep hover:bg-ink-50 px-6 py-5 rounded-md text-base transition"
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
              type={pergunta.tipo === "email" ? "email" : "text"}
              value={rascunho}
              onChange={(e) => setRascunho(e.target.value)}
              required={pergunta.obrigatoria}
            />
            <Button type="submit" className="mt-5">Continuar</Button>
          </form>
        )}
      </div>
    </div>
  );
}

/** Fim de caminho desenhado pelo autor da pesquisa. */
function TelaFinal({
  bloco,
  decisao,
  campanha,
  cpf,
}: {
  bloco: BlocoFeedback;
  decisao: DecisaoResultado | null;
  campanha: CampanhaLite;
  cpf: string;
}) {
  const cor = bloco.cor || COR_FEEDBACK[bloco.tipo];

  return (
    <ShellFluxo area={{ label: "Motorista", href: "/motorista" }} largura="estreita">
      <div className="passo-entra-frente">
        <div className="text-xs uppercase tracking-widest text-ink-600">{campanha.nome}</div>
        <div className="h-1 w-20 mt-6" style={{ backgroundColor: cor }} />

        {bloco.imagemUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bloco.imagemUrl} alt="" className="max-h-40 mt-7 object-contain" />
        )}

        <h1 className="display text-3xl md:text-4xl mt-6">{bloco.titulo}</h1>
        {bloco.mensagem && <p className="text-lg text-ink-700 mt-5">{bloco.mensagem}</p>}

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/motorista"
            className="inline-flex h-12 px-6 items-center rounded-full bg-ink-0 text-ink-900 border-2 border-vw-deep hover:bg-ink-100 transition text-base font-semibold"
          >
            Voltar
          </Link>
          <Link
            href={`/vendedor?cpf=${encodeURIComponent(cpf)}`}
            className="inline-flex h-12 px-6 items-center rounded-full text-ink-0 hover:opacity-90 transition text-base font-semibold"
            style={{ backgroundColor: cor }}
          >
            Ver como o vendedor enxerga →
          </Link>
        </div>

        {decisao && (
          <div className="mt-12 text-xs uppercase tracking-widest text-ink-600">
            RuleSet v{decisao.ruleSetVersao} · regra {decisao.regraAplicadaId} ·{" "}
            {decisao.decididoEm.slice(0, 19).replace("T", " ")}
          </div>
        )}
      </div>
    </ShellFluxo>
  );
}

function Resultado({
  decisao,
  contexto,
  campanha,
  cpf,
}: {
  decisao: DecisaoResultado;
  contexto: [string, unknown][];
  campanha: CampanhaLite;
  cpf: string;
}) {
  // O título é sempre navy; o estado se comunica pelo filete e pelo selo.
  const cfg = {
    elegivel: {
      tone: "go" as const,
      titulo: "Você está elegível",
      barra: "bg-signal-go",
      texto: "Suas condições especiais estão liberadas. Um vendedor da concessionária escolhida vai te procurar.",
    },
    nao_elegivel: {
      tone: "stop" as const,
      titulo: "Ainda não elegível",
      barra: "bg-signal-stop",
      texto: "Você pode voltar assim que atingir os critérios. Nada se perde.",
    },
    pendente_validacao: {
      tone: "warn" as const,
      titulo: "Análise pendente",
      barra: "bg-signal-warn",
      texto: "Nossa central vai analisar seu caso manualmente e retornar pelo canal informado.",
    },
    revalidar: {
      tone: "warn" as const,
      titulo: "Precisamos confirmar seus dados",
      barra: "bg-signal-warn",
      texto: "Encontramos uma divergência. A central vai entrar em contato para confirmar.",
    },
    erro: {
      tone: "warn" as const,
      titulo: "Não conseguimos decidir agora",
      barra: "bg-signal-warn",
      texto: "Houve um problema na consulta. Sua solicitação foi encaminhada para análise.",
    },
  }[decisao.tipo];

  return (
    <ShellFluxo area={{ label: "Motorista", href: "/motorista" }} largura="estreita">
      <div className="passo-entra-frente">
        <Badge tone={cfg.tone}>{campanha.nome}</Badge>
        <div className={`h-1 w-20 mt-7 ${cfg.barra}`} />
        <h1 className="display text-3xl md:text-4xl mt-6">{cfg.titulo}</h1>
        <p className="text-lg text-ink-700 mt-5">{cfg.texto}</p>

        <div className="mt-10 border-t hairline pt-8">
          <div className="text-xs uppercase tracking-widest text-ink-600 mb-2.5">Motivo</div>
          <p className="text-base">{decisao.motivo}</p>

          {/* Números que pesaram na decisão, sejam quais forem os hooks. */}
          {contexto.filter(([, v]) => typeof v === "number").length > 0 && (
            <div className="mt-8 grid grid-cols-3 gap-4">
              {contexto
                .filter(([, v]) => typeof v === "number")
                .slice(0, 3)
                .map(([k, v]) => (
                  <div key={k}>
                    <div className="display text-3xl">{Number(v).toLocaleString("pt-BR")}</div>
                    <div className="text-xs text-ink-600 mt-1.5">{k}</div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {decisao.tipo === "elegivel" && (
          <div className="mt-8 border-l-2 border-signal-go pl-4">
            <div className="text-xs uppercase tracking-widest text-signal-go mb-2">Próximo passo</div>
            <p className="text-base text-ink-700">
              Leve seu CPF <span className="mono">{cpf}</span> à concessionária. O vendedor consulta
              e o pedido já sai liberado.
            </p>
          </div>
        )}

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/motorista"
            className="inline-flex h-12 px-6 items-center rounded-full bg-ink-0 text-ink-900 border-2 border-vw-deep hover:bg-ink-100 transition text-base font-semibold"
          >
            Voltar
          </Link>
          <Link
            href={`/vendedor?cpf=${encodeURIComponent(cpf)}`}
            className="inline-flex h-12 px-6 items-center rounded-full bg-vw-deep text-ink-0 hover:bg-ink-800 transition text-base font-semibold"
          >
            Ver como o vendedor enxerga →
          </Link>
        </div>

        <div className="mt-12 text-xs uppercase tracking-widest text-ink-600">
          RuleSet v{decisao.ruleSetVersao} · regra {decisao.regraAplicadaId} ·{" "}
          {decisao.decididoEm.slice(0, 19).replace("T", " ")}
        </div>
      </div>
    </ShellFluxo>
  );
}

export default function Jornada() {
  return (
    <Suspense
      fallback={
        <ShellFluxo area={{ label: "Motorista", href: "/motorista" }} largura="estreita">
          <div />
        </ShellFluxo>
      }
    >
      <JornadaInner />
    </Suspense>
  );
}
