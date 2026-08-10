"use client";

import { Badge, Card } from "@/components/ui";
import { RuleSetStatus } from "@/lib/types";
import { useAviso } from "@/components/Avisos";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Versao = {
  id: string;
  versao: number;
  descricao: string;
  regras: number;
  ativo: boolean;
  status: RuleSetStatus;
  propostoPor: string;
  propostaEm: string;
  aprovadoPor?: string;
  aprovadoEm?: string;
  rejeitadoPor?: string;
  motivoRejeicao?: string;
};

const STATUS_TOM: Record<RuleSetStatus, "go" | "warn" | "stop" | "neutral" | "vw"> = {
  ativo: "vw",
  em_aprovacao: "warn",
  rejeitado: "stop",
  arquivado: "neutral",
};

const STATUS_LABEL: Record<RuleSetStatus, string> = {
  ativo: "ativa",
  em_aprovacao: "em aprovação",
  rejeitado: "rejeitada",
  arquivado: "arquivada",
};

export function VersoesPanel({
  campanhaId,
  versoes,
}: {
  campanhaId: string;
  versoes: Versao[];
}) {
  const router = useRouter();
  const { avisar } = useAviso();
  const [ocupado, setOcupado] = useState<string | null>(null);

  async function reativar(ruleSetId: string) {
    setOcupado(ruleSetId);
    const res = await fetch("/api/rulesets", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ campanhaId, ruleSetId, acao: "reativar" }),
    });
    const json = await res.json();
    setOcupado(null);
    if (!res.ok) {
      avisar(json.detalhe ?? json.erro ?? "Falha ao reativar.", "stop");
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <h3 className="text-sm font-semibold mb-4">
        Histórico e auditoria
      </h3>


      <ol className="space-y-3">
        {versoes.map((v) => (
          <li
            key={v.id}
            className={
              "border rounded-sm p-4 transition " +
              (v.ativo ? "border-vw-deep bg-vw-deep/5" : "hairline")
            }
          >
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="display-sm text-2xl">v{v.versao}</span>
              <Badge tone={STATUS_TOM[v.status]}>{STATUS_LABEL[v.status]}</Badge>
            </div>
            <p className="text-sm text-ink-700 mt-2">{v.descricao}</p>

            <dl className="mt-3 space-y-1 text-xs text-ink-600">
              <div>
                Proposta por <strong className="text-ink-800">{v.propostoPor}</strong>{" "}
                <span className="mono">{v.propostaEm.slice(0, 10)}</span>
              </div>
              {v.aprovadoPor && (
                <div>
                  Aprovada por <strong className="text-signal-go">{v.aprovadoPor}</strong>{" "}
                  <span className="mono">{v.aprovadoEm?.slice(0, 10)}</span>
                </div>
              )}
              {v.rejeitadoPor && (
                <div>
                  Rejeitada por <strong className="text-signal-stop">{v.rejeitadoPor}</strong>
                </div>
              )}
              <div>{v.regras} regras</div>
            </dl>

            {v.motivoRejeicao && (
              <p className="text-sm text-ink-700 border-l-4 border-signal-stop pl-3 mt-3">
                {v.motivoRejeicao}
              </p>
            )}

            {!v.ativo && v.status === "arquivado" && (
              <button
                type="button"
                onClick={() => reativar(v.id)}
                disabled={ocupado !== null}
                className="mt-3 text-sm font-semibold text-vw-deep underline hover:no-underline disabled:opacity-40"
              >
                {ocupado === v.id ? "Reativando..." : "Voltar para esta versão"}
              </button>
            )}
          </li>
        ))}
      </ol>

      <p className="text-xs text-ink-600 mt-4">
        Decisões já tomadas continuam apontando para a versão em que foram geradas. Reativar exige
        permissão de aprovação.
      </p>
    </Card>
  );
}
