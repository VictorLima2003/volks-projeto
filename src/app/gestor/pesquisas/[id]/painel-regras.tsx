"use client";

import { Badge, Button, Card } from "@/components/ui";
import { diffRuleSets, explicarRegra } from "@/lib/engine";
import { usuarioPorId } from "@/lib/identidade";
import { acharDesfecho, Desfecho, RuleSet } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { VersoesPanel } from "./versoes-panel";

/**
 * As regras da pesquisa: a versão que vale, o histórico e o que mudou.
 *
 * Já foi uma seção do sistema chamada "réguas". Era o nome errado e o lugar
 * errado: regra é condição sobre o que esta pesquisa coletou, então editá-la
 * longe das perguntas obrigava a ir e voltar para lembrar quais fatos existem.
 */
export function PainelRegras({
  pesquisaId,
  versoes,
  versaoAtivaId,
  desfechos,
  podeEditar,
}: {
  pesquisaId: string;
  versoes: RuleSet[];
  versaoAtivaId?: string;
  /** Os fins desta pesquisa — de onde saem rótulo e tom de cada regra. */
  desfechos: Desfecho[];
  podeEditar: boolean;
}) {
  const router = useRouter();
  const rs = versoes.find((v) => v.id === versaoAtivaId);
  const porVersao = [...versoes].sort((a, b) => b.versao - a.versao);
  const pendente = versoes.find((r) => r.status === "em_revisao");

  // A referência é a última versão que REALMENTE valeu (arquivada), não a de
  // número anterior — que pode ter sido recusada e nunca ter valido.
  const anterior = rs
    ? porVersao.find((v) => v.status === "arquivado" && v.versao < rs.versao)
    : undefined;
  const mudancas = rs ? diffRuleSets(rs, anterior) : [];
  const ordenadas = rs ? [...rs.regras].sort((a, b) => a.prioridade - b.prioridade) : [];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <p className="text-base text-ink-700 max-w-2xl">
          {rs
            ? `Versão v${rs.versao} em produção, com ${rs.regras.length} critérios.`
            : "Esta pesquisa ainda não decide nada — ela só coleta respostas. Escreva as regras e proponha a primeira versão."}
        </p>
        <Button
          disabled={!podeEditar}
          onClick={() => router.push(`/gestor/pesquisas/${pesquisaId}/regras-editar`)}
        >
          {rs ? "Editar regras" : "Escrever regras"}
        </Button>
      </div>

      {pendente && (
        <div className="border border-signal-warn/45 bg-signal-warn/10 rounded-md p-6 mb-8 flex flex-wrap items-center gap-4">
          <Badge tone="warn">v{pendente.versao} em revisão</Badge>
          <span className="text-base text-ink-800">
            Proposta por {usuarioPorId(pendente.propostoPor).nome}. Só entra em produção depois de
            publicada por outra pessoa.
          </span>
          <Link
            href="/gestor/revisoes"
            className="ml-auto text-sm font-semibold text-vw-deep underline hover:no-underline"
          >
            Ir para as revisões →
          </Link>
        </div>
      )}

      {/* Duas colunas de verdade: os critérios à esquerda, o histórico à
          direita. Enquanto tudo dividia a mesma fileira de três, o painel de
          versões ficava sozinho num terço e as outras duas colunas eram um
          buraco branco do tamanho da tela. */}
      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-3">
          {rs && mudancas.length > 0 && (
          <Card>
            <div className="text-sm font-semibold text-ink-600 mb-3">
              O que mudou da v{rs.versao - 1} para a v{rs.versao}
            </div>
            <ul className="space-y-1.5 text-sm">
              {mudancas.map((m, i) => (
                <li key={i} className="mono text-ink-700">{m}</li>
              ))}
            </ul>
          </Card>
          )}

        {ordenadas.map((r) => {
          const desfecho = acharDesfecho(desfechos, r.resultado);
          const tone: "go" | "stop" | "warn" | "neutral" =
            desfecho.tom === "go" ? "go"
            : desfecho.tom === "stop" ? "stop"
            : desfecho.tom === "espera" ? "warn"
            : "neutral";
          return (
            <Card key={r.id} className="flex items-start gap-6">
              <div className="mono text-sm text-ink-600 w-14 shrink-0">P{String(r.prioridade).padStart(3, "0")}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap mb-2.5">
                  <Badge tone={tone}>{desfecho.rotulo}</Badge>
                  <span className="text-base font-semibold">{r.nome}</span>
                </div>
                <div className="text-sm text-ink-700 mono mb-4 bg-ink-100 border hairline rounded-sm p-3 overflow-x-auto">
                  {explicarRegra(r)}
                </div>
                <div className="grid md:grid-cols-2 gap-5 text-base">
                  <div>
                    <div className="text-sm font-semibold text-ink-600 mb-1.5">Motivo (motorista/vendedor)</div>
                    <div className="text-ink-800">{r.motivo}</div>
                  </div>
                  {r.proximaAcao && (
                    <div>
                      <div className="text-sm font-semibold text-ink-600 mb-1.5">Próxima ação</div>
                      <div className="text-ink-800">{r.proximaAcao}</div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
        </div>

        <VersoesPanel
          pesquisaId={pesquisaId}
          versoes={porVersao.map((v) => ({
            id: v.id,
            versao: v.versao,
            descricao: v.descricao,
            regras: v.regras.length,
            ativo: v.id === versaoAtivaId,
            status: v.status,
            propostoPor: usuarioPorId(v.propostoPor).nome,
            propostaEm: v.propostaEm,
            publicadoPor: v.publicadoPor ? usuarioPorId(v.publicadoPor).nome : undefined,
            publicadoEm: v.publicadoEm,
            recusadoPor: v.recusadoPor ? usuarioPorId(v.recusadoPor).nome : undefined,
            motivoRecusa: v.motivoRecusa,
          }))}
        />
      </div>

    </div>
  );
}
