"use client";

import { Badge, Button, Card, Label, Textarea } from "@/components/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Proposta {
  campanhaId: string;
  campanhaNome: string;
  ruleSetId: string;
  versao: number;
  descricao: string;
  propostoPor: string;
  propostaEm: string;
  regras: number;
  mudancas: string[];
  versaoAnterior?: number;
  anteriorEmProducao?: boolean;
}

export function PainelAprovacao({
  proposta,
  podeAprovar,
  souOPropositor,
  meuNome,
}: {
  proposta: Proposta;
  podeAprovar: boolean;
  souOPropositor: boolean;
  meuNome: string;
}) {
  const router = useRouter();
  const [motivo, setMotivo] = useState("");
  const [mostrarRejeicao, setMostrarRejeicao] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const bloqueado = !podeAprovar || souOPropositor;

  async function decidir(acao: "aprovar" | "rejeitar") {
    setOcupado(true);
    setErro(null);
    const res = await fetch("/api/rulesets", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        campanhaId: proposta.campanhaId,
        ruleSetId: proposta.ruleSetId,
        acao,
        motivo,
      }),
    });
    const json = await res.json();
    setOcupado(false);
    if (!res.ok) {
      setErro(json.detalhe ?? json.erro ?? "Falha ao registrar decisão.");
      return;
    }
    router.refresh();
  }

  return (
    <Card className="p-0 overflow-hidden">
      <div className="h-1.5 bg-signal-warn" />
      <div className="p-7">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Badge tone="warn">aguardando aprovação</Badge>
          <span className="display-sm text-2xl">v{proposta.versao}</span>
          <span className="text-base text-ink-700">{proposta.campanhaNome}</span>
          <Link
            href={`/gestor/campanhas/${proposta.campanhaId}/simulador`}
            className="ml-auto text-sm font-semibold text-vw-deep underline hover:no-underline"
          >
            Simular antes de decidir →
          </Link>
        </div>

        <p className="text-base text-ink-800">{proposta.descricao}</p>
        <div className="text-sm text-ink-600 mt-2">
          Proposta por <strong className="text-ink-900">{proposta.propostoPor}</strong> em{" "}
          <span className="mono text-xs">{proposta.propostaEm.slice(0, 16).replace("T", " ")}</span>
          {" · "}{proposta.regras} regras
        </div>

        <div className="mt-6 pt-6 border-t hairline">
          <div className="text-xs font-bold uppercase tracking-widest text-ink-600 mb-3">
            {proposta.versaoAnterior
              ? `Mudanças em relação à v${proposta.versaoAnterior}${
                  proposta.anteriorEmProducao ? " (em produção hoje)" : ""
                }`
              : "Primeira versão"}
          </div>
          {proposta.mudancas.length === 0 ? (
            <p className="text-sm text-ink-600">Nenhuma diferença detectada nas regras.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {proposta.mudancas.map((m, i) => (
                <li key={i} className="mono text-ink-700">{m}</li>
              ))}
            </ul>
          )}
        </div>

        {erro && (
          <div className="mt-5 border border-signal-stop/45 bg-signal-stop/10 rounded-sm p-4 text-sm text-signal-stop">
            {erro}
          </div>
        )}

        {souOPropositor && (
          <div className="mt-5 border border-signal-warn/45 bg-signal-warn/10 rounded-sm p-4">
            <div className="text-xs font-bold uppercase tracking-widest text-signal-warn mb-1.5">
              Você propôs esta versão
            </div>
            <p className="text-sm text-ink-800">
              {meuNome} não pode aprovar a própria proposta. Outra pessoa com permissão de aprovação
              precisa revisar.
            </p>
          </div>
        )}

        {!bloqueado && (
          <div className="mt-6 flex flex-wrap gap-3 items-start">
            <Button variant="go" onClick={() => decidir("aprovar")} disabled={ocupado}>
              {ocupado ? "Registrando..." : "Aprovar e ativar"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setMostrarRejeicao((v) => !v)}
              disabled={ocupado}
            >
              Rejeitar
            </Button>
          </div>
        )}

        {!bloqueado && mostrarRejeicao && (
          <div className="mt-5">
            <Label htmlFor={`m-${proposta.ruleSetId}`}>Por que está rejeitando?</Label>
            <Textarea
              id={`m-${proposta.ruleSetId}`}
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex.: reduzir corridas para 400 estoura a verba prevista para a campanha."
            />
            <Button
              variant="danger"
              onClick={() => decidir("rejeitar")}
              disabled={ocupado || !motivo.trim()}
              className="mt-3"
            >
              Confirmar rejeição
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
