"use client";

import { Badge, Button, Card, Label, Textarea } from "@/components/ui";
import Link from "next/link";
import { useAviso } from "@/components/Avisos";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Proposta {
  pesquisaId: string;
  pesquisaNome: string;
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

export function PainelRevisao({
  proposta,
  podeRevisar,
  souOPropositor,
  meuNome,
}: {
  proposta: Proposta;
  podeRevisar: boolean;
  souOPropositor: boolean;
  meuNome: string;
}) {
  const router = useRouter();
  const { avisar } = useAviso();
  const [motivo, setMotivo] = useState("");
  const [mostrarRecusa, setMostrarRecusa] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const bloqueado = !podeRevisar || souOPropositor;

  async function decidir(acao: "publicar" | "recusar") {
    setOcupado(true);
    const res = await fetch("/api/rulesets", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        pesquisaId: proposta.pesquisaId,
        ruleSetId: proposta.ruleSetId,
        acao,
        motivo,
      }),
    });
    const json = await res.json();
    setOcupado(false);
    if (!res.ok) {
      avisar(json.detalhe ?? json.erro ?? "Falha ao registrar decisão.", "stop");
      return;
    }
    avisar(
      acao === "publicar"
        ? `Versão v${proposta.versao} publicada e valendo.`
        : `Versão v${proposta.versao} recusada.`,
      acao === "publicar" ? "go" : "warn",
    );
    router.refresh();
  }

  return (
    <Card className="p-0 overflow-hidden">
      <div className="h-1.5 bg-signal-warn" />
      <div className="p-7">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Badge tone="warn">em revisão</Badge>
          <span className="display-sm text-2xl">v{proposta.versao}</span>
          <span className="text-base text-ink-700">{proposta.pesquisaNome}</span>
          <Link
            href={`/gestor/pesquisas/${proposta.pesquisaId}`}
            className="ml-auto text-sm font-semibold text-vw-deep underline hover:no-underline"
          >
            Ver a pesquisa →
          </Link>
        </div>

        <p className="text-base text-ink-800">{proposta.descricao}</p>
        <div className="text-sm text-ink-600 mt-2">
          Proposta por <strong className="text-ink-900">{proposta.propostoPor}</strong> em{" "}
          <span className="mono text-xs">{proposta.propostaEm.slice(0, 16).replace("T", " ")}</span>
          {" · "}{proposta.regras} regras
        </div>

        <div className="mt-6 pt-6 border-t hairline">
          <div className="text-sm font-semibold text-ink-600 mb-3">
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


        {souOPropositor && (
          <div className="mt-5 border border-signal-warn/45 bg-signal-warn/10 rounded-sm p-4">
            <div className="text-sm font-semibold text-signal-warn mb-1.5">
              Você propôs esta versão
            </div>
            <p className="text-sm text-ink-800">
              {meuNome} não revisa a própria versão. Outra pessoa com permissão de revisão precisa
              olhar e publicar.
            </p>
          </div>
        )}

        {!bloqueado && (
          <div className="mt-6 flex flex-wrap gap-3 items-start">
            <Button onClick={() => decidir("publicar")} disabled={ocupado}>
              {ocupado ? "Registrando..." : "Publicar versão"}
            </Button>
            <Button
              variant="recusa"
              onClick={() => setMostrarRecusa((v) => !v)}
              disabled={ocupado}
            >
              Recusar
            </Button>
          </div>
        )}

        {!bloqueado && mostrarRecusa && (
          <div className="mt-5">
            <Label htmlFor={`m-${proposta.ruleSetId}`}>Por que está recusando?</Label>
            <Textarea
              id={`m-${proposta.ruleSetId}`}
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex.: reduzir corridas para 400 estoura a verba prevista."
            />
            <Button
              variant="danger"
              onClick={() => decidir("recusar")}
              disabled={ocupado || !motivo.trim()}
              className="mt-3"
            >
              Confirmar recusa
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
