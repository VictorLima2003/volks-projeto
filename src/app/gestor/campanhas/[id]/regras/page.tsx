import { ShellGestor } from "@/components/ShellGestor";
import { Badge, Card, LinkButton } from "@/components/ui";
import { diffRuleSets, explicarRegra, resultadoLabel, ruleSetAtivo } from "@/lib/engine";
import { obterCampanha } from "@/lib/store";
import { usuarioPorId } from "@/lib/identidade";
import { notFound } from "next/navigation";
import Link from "next/link";
import { VersoesPanel } from "./versoes-panel";

export const dynamic = "force-dynamic";

export default function Regras({ params }: { params: { id: string } }) {
  const c = obterCampanha(params.id);
  if (!c) return notFound();
  const rs = ruleSetAtivo(c);
  const ordenadas = [...rs.regras].sort((a, b) => a.prioridade - b.prioridade);

  const porVersao = [...c.ruleSets].sort((a, b) => b.versao - a.versao);
  // A referência é a última versão que REALMENTE valeu (arquivada),
  // não a de número anterior — que pode ter sido rejeitada e nunca ter valido.
  const anterior = porVersao.find((v) => v.status === "arquivado" && v.versao < rs.versao);
  const mudancas = diffRuleSets(rs, anterior);
  const pendente = c.ruleSets.find((r) => r.status === "em_aprovacao");

  return (
    <ShellGestor
      secao="campanhas"
      crumbs={[
        { label: "Gestor", href: "/gestor" },
        { label: c.nome, href: `/gestor/campanhas/${c.id}` },
        { label: "Regras" },
      ]}
      title={`Regras · v${rs.versao}`}
      action={
        <div className="flex flex-wrap gap-2">
          <LinkButton href={`/gestor/campanhas/${c.id}/simulador`} variant="secondary">
            Simular
          </LinkButton>
          <LinkButton href={`/gestor/campanhas/${c.id}/regras/editar`}>Editar regras</LinkButton>
        </div>
      }
    >
      {pendente && (
        <div className="border border-signal-warn/45 bg-signal-warn/10 rounded-md p-6 mb-8 flex flex-wrap items-center gap-4">
          <Badge tone="warn">v{pendente.versao} aguardando aprovação</Badge>
          <span className="text-base text-ink-800">
            Proposta por {usuarioPorId(pendente.propostoPor).nome}. Só entra em produção depois de
            aprovada por outra pessoa.
          </span>
          <Link
            href="/gestor/aprovacoes"
            className="ml-auto text-sm font-semibold text-vw-deep underline hover:no-underline"
          >
            Ir para aprovações →
          </Link>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <h3 className="text-lg font-semibold tracking-tight mb-2">Como o motor decide</h3>
          <p className="text-base text-ink-700">
            As regras são avaliadas em ordem de prioridade (menor número = mais prioritária).
            A <strong>primeira</strong> regra que casar com os fatos determina o resultado.
            Fatos vêm da base Uber (<span className="mono text-vw-deep">uber.*</span>) e das respostas
            do motorista (<span className="mono text-vw-deep">resposta.*</span>).
          </p>
          {mudancas.length > 0 && (
            <div className="mt-6 pt-6 border-t hairline">
              <div className="text-xs font-bold uppercase tracking-widest text-ink-600 mb-3">
                O que mudou da v{rs.versao - 1} para a v{rs.versao}
              </div>
              <ul className="space-y-1.5 text-sm">
                {mudancas.map((m, i) => (
                  <li key={i} className="mono text-ink-700">{m}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <VersoesPanel
          campanhaId={c.id}
          versoes={porVersao.map((v) => ({
            id: v.id,
            versao: v.versao,
            descricao: v.descricao,
            regras: v.regras.length,
            ativo: v.id === c.ruleSetAtivoId,
            status: v.status,
            propostoPor: usuarioPorId(v.propostoPor).nome,
            propostaEm: v.propostaEm,
            aprovadoPor: v.aprovadoPor ? usuarioPorId(v.aprovadoPor).nome : undefined,
            aprovadoEm: v.aprovadoEm,
            rejeitadoPor: v.rejeitadoPor ? usuarioPorId(v.rejeitadoPor).nome : undefined,
            motivoRejeicao: v.motivoRejeicao,
          }))}
        />
      </div>

      <div className="space-y-3">
        {ordenadas.map((r) => {
          const tone: "go" | "stop" | "warn" | "neutral" =
            r.resultado === "elegivel" ? "go"
            : r.resultado === "nao_elegivel" ? "stop"
            : r.resultado === "revalidar" || r.resultado === "pendente_validacao" ? "warn"
            : "neutral";
          return (
            <Card key={r.id} className="flex items-start gap-6">
              <div className="mono text-sm text-ink-600 w-14 shrink-0">P{String(r.prioridade).padStart(3, "0")}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap mb-2.5">
                  <Badge tone={tone}>{resultadoLabel(r.resultado)}</Badge>
                  <span className="text-base font-semibold">{r.nome}</span>
                </div>
                <div className="text-sm text-ink-700 mono mb-4 bg-ink-100 border hairline rounded-sm p-3 overflow-x-auto">
                  {explicarRegra(r)}
                </div>
                <div className="grid md:grid-cols-2 gap-5 text-base">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-ink-600 mb-1.5">Motivo (motorista/vendedor)</div>
                    <div className="text-ink-800">{r.motivo}</div>
                  </div>
                  {r.proximaAcao && (
                    <div>
                      <div className="text-xs font-bold uppercase tracking-widest text-ink-600 mb-1.5">Próxima ação</div>
                      <div className="text-ink-800">{r.proximaAcao}</div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </ShellGestor>
  );
}
