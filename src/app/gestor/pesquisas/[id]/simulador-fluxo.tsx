"use client";

import { TelaDeDesfecho } from "@/components/ResultadoDecisao";
import { Badge, Button, Card, Input, Label } from "@/components/ui";
import { montarFatos, proximoPasso, resolverArgumentos, todasAsPerguntas } from "@/lib/engine";
import {
  Apresentacao,
  Bloco,
  BlocoPergunta,
  ehConsulta,
  ehFeedback,
  ehPergunta,
} from "@/lib/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PreviaDaCapa } from "./previa-capa";

interface Registro {
  rotulo: string;
  detalhe: string;
  tipo: "capa" | "pergunta" | "consulta" | "fim";
  /** Entra na contagem de perguntas respondidas. A capa entra quando colheu algo. */
  conta?: boolean;
}

/**
 * Simulação ponta a ponta: responde de verdade, dispara as consultas de verdade
 * e mostra os fatos se acumulando. É a mesma máquina da jornada do respondente,
 * com o painel de bastidores aberto ao lado.
 */
export function SimuladorFluxo({
  pesquisaId,
  blocos,
  salvo,
  apresentacao,
  titulo,
  descricao,
}: {
  pesquisaId: string;
  blocos: Bloco[];
  salvo: boolean;
  apresentacao: Apresentacao;
  titulo: string;
  descricao: string;
}) {
  const [respostas, setRespostas] = useState<Record<string, unknown>>({});
  /* A simulação começa onde o respondente começa: na capa. */
  const [passouDaCapa, setPassouDaCapa] = useState(false);
  const [externos, setExternos] = useState<Record<string, Record<string, unknown>>>({});
  const [feitas, setFeitas] = useState<Set<string>>(new Set());
  const [trilha, setTrilha] = useState<Registro[]>([]);
  const [rascunho, setRascunho] = useState("");
  const [consultando, setConsultando] = useState<string | null>(null);

  const total = useMemo(() => todasAsPerguntas(blocos).length, [blocos]);

  // Não há mais "contexto de teste" pré-carregado: o contexto é o que você
  // responde. Os hooks é que trazem o resto, exatamente como em produção.
  const reiniciar = useCallback(() => {
    setRespostas({});
    setExternos({});
    setFeitas(new Set());
    setTrilha([]);
    setRascunho("");
    setPassouDaCapa(false);
  }, []);

  /** A capa entregou o que tinha para entregar; o fluxo começa agora. */
  function comecar(resposta: { campo: string; valor: string } | null) {
    if (resposta) {
      setRespostas({ [resposta.campo]: resposta.valor });
      setTrilha([
        {
          tipo: "capa",
          rotulo: "Capa",
          detalhe: `${resposta.campo} = ${resposta.valor}`,
          conta: true,
        },
      ]);
    } else {
      setTrilha([{ tipo: "capa", rotulo: "Capa", detalhe: "sem resposta — só o convite" }]);
    }
    setPassouDaCapa(true);
  }

  const fatos = useMemo(() => montarFatos(respostas, externos), [respostas, externos]);

  const passo = useMemo(() => proximoPasso(blocos, fatos, feitas), [blocos, fatos, feitas]);

  /** Dispara a consulta quando o fluxo para nela — igual à jornada real. */
  useEffect(() => {
    /* Nada dispara antes da capa: na jornada real, a consulta que usa o dado da
       capa só roda depois que ele foi digitado. */
    if (!passouDaCapa) return;
    if (!passo || !ehConsulta(passo) || consultando === passo.id) return;
    const alvo = passo;
    setConsultando(alvo.id);

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
        setExternos((e) => ({ ...e, [json.prefixo ?? "externo"]: json.fatos ?? {} }));
        setFeitas((s) => new Set(s).add(alvo.id));
        setTrilha((t) => [
          ...t,
          {
            tipo: "consulta",
            rotulo: alvo.rotulo,
            detalhe: json.fatos?.encontrado
              ? `${json.prefixo}: registro encontrado`
              : `${json.prefixo}: nada encontrado`,
          },
        ]);
        setConsultando(null);
      })
      .catch(() => {
        setFeitas((s) => new Set(s).add(alvo.id));
        setTrilha((t) => [...t, { tipo: "consulta", rotulo: alvo.rotulo, detalhe: "falhou" }]);
        setConsultando(null);
      });
  }, [passo, pesquisaId, respostas, consultando, passouDaCapa]);

  function responder(p: BlocoPergunta, valor: unknown) {
    setRespostas((r) => ({ ...r, [p.campo]: valor }));
    setRascunho("");
    setTrilha((t) => [
      ...t,
      { tipo: "pergunta", rotulo: p.rotulo, detalhe: `${p.campo} = ${String(valor)}`, conta: true },
    ]);
  }

  const pergunta = passo && ehPergunta(passo) ? passo : null;
  const fim = passo && ehFeedback(passo) ? passo : null;
  const acabouSemFim = passo === null;

  return (
    /*
     * Uma coluna só, empilhada: o que roda em cima, os bastidores embaixo.
     *
     * Enquanto os bastidores eram uma coluna lateral, eles comiam um terço da
     * largura o tempo todo — e é largura que a tela em execução usa, porque ela
     * imita uma página inteira. Percurso e fatos continuam visíveis sem rolar
     * em telas normais, e agora lado a lado entre si.
     */
    <div className="space-y-5">
      {/* ---------------- Painel de execução ---------------- */}
      <div className="space-y-5">
        <Card className="flex flex-wrap items-center gap-4">
          <Button variant="secondary" onClick={reiniciar}>
            Reiniciar
          </Button>
          <p className="text-sm text-ink-600 flex-1 min-w-64">
            Responda como um participante responderia. Os hooks executam de verdade
            {!salvo && (
              <>
                {" "}— usando a versão <strong>já salva</strong> deles no servidor
              </>
            )}
            .
          </p>
        </Card>

        {/*
         * A capa vem antes de tudo, e é interativa: sair dela é o primeiro
         * passo da simulação, como é do respondente. Depois que passa, ela sai
         * de cena — deixá-la ali só empurraria a pergunta da vez para baixo da
         * dobra, e o que se está conferindo agora é o fluxo.
         */}
        {!passouDaCapa ? (
          <PreviaDaCapa
            apresentacao={apresentacao}
            titulo={titulo}
            descricao={descricao}
            onComecar={comecar}
          />
        ) : (
        <Card className="min-h-72 flex flex-col justify-center">
          {consultando && (
            <div className="text-center py-8">
              <div className="text-base text-ink-700">Consultando fonte externa...</div>
            </div>
          )}

          {!consultando && pergunta && (
            <PerguntaSimulada
              key={pergunta.id}
              pergunta={pergunta}
              rascunho={rascunho}
              setRascunho={setRascunho}
              onResponder={responder}
            />
          )}

          {/* A tela de fim aqui é a mesma que o respondente vê — inclusive os
              números e o quadro do próximo passo. Um resumo diferente era
              justamente o que deixava passar despercebido que a tela real
              mostrava menos do que o bloco configurava. */}
          {!consultando && fim && (
            <TelaDeDesfecho
              nomeDaPesquisa={titulo}
              tom={
                ({ sucesso: "go", info: "neutro", warning: "espera", error: "stop" } as const)[
                  fim.tipo
                ]
              }
              titulo={fim.titulo || "(sem título)"}
              texto={fim.mensagem}
              imagemUrl={fim.imagemUrl}
              numeros={
                fim.mostrarNumeros
                  ? Object.entries(fatos)
                      .flatMap(([ns, v]) =>
                        v && typeof v === "object"
                          ? Object.entries(v as Record<string, unknown>).map(
                              ([k, val]) => [`${ns}.${k}`, val] as [string, unknown],
                            )
                          : [],
                      )
                      .filter(([, v]) => typeof v === "number")
                      .slice(0, 3)
                  : []
              }
              proximoPasso={fim.proximoPasso}
            />
          )}

          {!consultando && acabouSemFim && (
            <div>
              <Badge tone="neutral">fim do fluxo</Badge>
              <div className="display text-2xl mt-4">Sem tela final neste caminho</div>
              <p className="text-base text-ink-700 mt-3">
                O respondente veria o resultado padrão calculado pelas regras. Adicione um bloco de
                tela final se quiser controlar a mensagem.
              </p>
            </div>
          )}
        </Card>
        )}
      </div>

      {/* ---------------- Bastidores ---------------- */}
      <div className="grid lg:grid-cols-2 gap-5 items-start">
        <Card>
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="text-sm font-semibold">Percurso</h3>
            <span className="text-sm text-ink-600">
              {trilha.filter((t) => t.conta).length} de {total}
            </span>
          </div>
          {trilha.length === 0 ? (
            <p className="text-sm text-ink-600">Responda ao lado para o percurso aparecer.</p>
          ) : (
            <ol className="space-y-2.5">
              {trilha.map((t, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mono text-xs text-ink-600 mt-0.5 shrink-0">{i + 1}</span>
                  <div className="min-w-0">
                    <div className="text-sm flex items-center gap-2">
                      {t.tipo === "consulta" && <Badge tone="warn">busca</Badge>}
                      {t.tipo === "capa" && <Badge tone="vw">capa</Badge>}
                      <span className="truncate">{t.rotulo}</span>
                    </div>
                    <div className="mono text-xs text-ink-600 mt-0.5 break-all">{t.detalhe}</div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card>
          <h3 className="text-sm font-semibold mb-4">
            Fatos acumulados
          </h3>
          <pre className="mono text-xs bg-ink-100 border hairline rounded-sm p-3 overflow-x-auto max-h-72">
            {Object.entries(fatos)
              .flatMap(([ns, v]) =>
                v && typeof v === "object"
                  ? Object.entries(v as Record<string, unknown>).map(
                      ([k, val]) => `${ns}.${k} = ${JSON.stringify(val)}`,
                    )
                  : [],
              )
              .join("\n") || "(vazio)"}
          </pre>
          <p className="text-xs text-ink-600 mt-3">
            É exatamente isto que as condicionais e as regras enxergam.
          </p>
        </Card>
      </div>
    </div>
  );
}

function PerguntaSimulada({
  pergunta,
  rascunho,
  setRascunho,
  onResponder,
}: {
  pergunta: BlocoPergunta;
  rascunho: string;
  setRascunho: (v: string) => void;
  onResponder: (p: BlocoPergunta, valor: unknown) => void;
}) {
  const textual = ["texto", "numero", "data", "cpf", "email", "telefone"].includes(pergunta.tipo);

  return (
    <div className="passo-entra-frente">
      <span className="mono text-xs bg-ink-100 border hairline rounded-sm px-2 py-0.5">
        {pergunta.campo}
      </span>
      <h3 className="display text-2xl mt-4">{pergunta.rotulo}</h3>
      {pergunta.ajuda && <p className="text-base text-ink-600 mt-2.5">{pergunta.ajuda}</p>}

      <div className="mt-7">
        {pergunta.tipo === "consentimento" && (
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => onResponder(pergunta, true)}>Autorizo</Button>
            <Button variant="secondary" onClick={() => onResponder(pergunta, false)}>
              Não autorizo
            </Button>
          </div>
        )}

        {(pergunta.tipo === "opcao" || pergunta.tipo === "multipla") && (
          <div className="grid gap-2 max-w-lg">
            {(pergunta.opcoes ?? []).map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => onResponder(pergunta, o)}
                className="text-left border hairline bg-ink-0 hover:border-vw-deep hover:bg-ink-50 px-5 py-3.5 rounded-sm text-base transition"
              >
                {o}
              </button>
            ))}
          </div>
        )}

        {textual && (
          <form
            className="max-w-lg"
            onSubmit={(e) => {
              e.preventDefault();
              if (!rascunho.trim()) return;
              onResponder(pergunta, rascunho.trim());
            }}
          >
            <Input
              autoFocus
              type={pergunta.tipo === "numero" ? "number" : pergunta.tipo === "data" ? "date" : "text"}
              value={rascunho}
              onChange={(e) => setRascunho(e.target.value)}
            />
            <Button type="submit" className="mt-4">Responder</Button>
          </form>
        )}
      </div>
    </div>
  );
}
