import { ShellGestor } from "@/components/ShellGestor";
import { Badge, Card, LinkButton, Stat, Table, TD, TH, THead, TR } from "@/components/ui";
import { contarBlocos, ruleSetAtivo } from "@/lib/engine";
import { listarSessoes, listarPedidos, obterCampanha } from "@/lib/store";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default function CampanhaOverview({ params }: { params: { id: string } }) {
  const c = obterCampanha(params.id);
  if (!c) return notFound();

  const rs = ruleSetAtivo(c);
  const sessoes = listarSessoes(c.id);
  const pedidos = listarPedidos().filter((p) => p.campanhaId === c.id);

  const kpi = {
    elegiveis: sessoes.filter((s) => s.resultado?.tipo === "elegivel").length,
    naoElegiveis: sessoes.filter((s) => s.resultado?.tipo === "nao_elegivel").length,
    pendentes: sessoes.filter((s) => s.resultado?.tipo === "pendente_validacao" || s.resultado?.tipo === "revalidar").length,
    concluidas: sessoes.filter((s) => s.status === "concluida").length,
  };

  return (
    <ShellGestor
      secao="campanhas"
      title={c.nome}
      action={
        <div className="flex flex-wrap gap-2">
          <LinkButton href={`/gestor/campanhas/${c.id}/base`} variant="secondary">Base Uber</LinkButton>
          <LinkButton href={`/gestor/campanhas/${c.id}/hooks`} variant="secondary">Hooks</LinkButton>
          <LinkButton href={`/gestor/campanhas/${c.id}/pesquisa`} variant="secondary">Pesquisa</LinkButton>
          <LinkButton href={`/gestor/campanhas/${c.id}/simulador`} variant="secondary">Simulador</LinkButton>
          <LinkButton href={`/gestor/campanhas/${c.id}/regras`}>Regras (v{rs.versao})</LinkButton>
        </div>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        <Stat label="Elegíveis" value={kpi.elegiveis} tone="go" />
        <Stat label="Não elegíveis" value={kpi.naoElegiveis} tone="stop" />
        <Stat label="Em análise" value={kpi.pendentes} tone="warn" />
        <Stat label="Pedidos" value={pedidos.length} tone="vw" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold tracking-tight">Sessões recentes</h3>
            <Badge tone={c.status === "ativa" ? "go" : "neutral"}>{c.status}</Badge>
          </div>
          <Table>
            <THead>
              <tr>
                <TH>CPF</TH>
                <TH>Iniciada</TH>
                <TH>Resultado</TH>
                <TH>Motivo</TH>
              </tr>
            </THead>
            <tbody>
              {sessoes.length === 0 && (
                <TR>
                  <TD className="text-ink-600" >Sem sessões ainda.</TD>
                  <TD /><TD /><TD />
                </TR>
              )}
              {sessoes.map((s) => (
                <TR key={s.id}>
                  <TD className="mono">{s.cpf}</TD>
                  <TD className="text-xs text-ink-600 mono">{s.iniciadaEm.slice(0, 16).replace("T", " ")}</TD>
                  <TD>
                    {s.resultado ? (
                      <Badge tone={
                        s.resultado.tipo === "elegivel" ? "go"
                        : s.resultado.tipo === "nao_elegivel" ? "stop"
                        : "warn"
                      }>{s.resultado.tipo.replace("_", " ")}</Badge>
                    ) : (
                      <Badge>em andamento</Badge>
                    )}
                  </TD>
                  <TD className="text-xs text-ink-700">{s.resultado?.motivo ?? "-"}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </Card>

        <div className="space-y-6">
          <Card>
            <h3 className="text-sm font-semibold">Configuração</h3>
            <dl className="mt-4 text-sm space-y-2">
              <div className="flex justify-between"><dt className="text-ink-600">Modelos</dt><dd className="text-right">{c.modelos.join(", ")}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-600">Rede</dt><dd className="text-right">{c.concessionaria}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-600">Cidades</dt><dd className="text-right">{c.cidadesAlvo.join(", ")}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-600">Vigência</dt><dd className="mono text-xs">{c.vigenciaInicio} → {c.vigenciaFim}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-600">Verba</dt><dd className="mono text-xs">R$ {(c.verbaTotal / 1000).toFixed(0)}k</dd></div>
              <div className="flex justify-between"><dt className="text-ink-600">Pesquisa</dt><dd>{contarBlocos(c.blocos).perguntas}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-600">RuleSet ativo</dt><dd className="mono">v{rs.versao}</dd></div>
            </dl>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold">Link de teste</h3>
            <p className="text-sm text-ink-700 mt-3">
              Compartilhe com um motorista de teste:
            </p>
            <div className="mono text-xs bg-ink-0 border hairline-strong p-3 mt-3 break-all">
              /motorista?campanha={c.id}
            </div>
            <p className="text-sm text-ink-700 mt-4">
              <Link
                href="/documentos"
                className="underline underline-offset-4 decoration-ink-300 hover:decoration-vw-deep transition"
              >
                CPFs para testar
              </Link>{" "}
              leva a uma lista de documentos que produzem decisões diferentes.
            </p>
          </Card>
        </div>
      </div>
    </ShellGestor>
  );
}
