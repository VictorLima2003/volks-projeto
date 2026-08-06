import { ShellGestor } from "@/components/ShellGestor";
import { Badge, Card, LinkButton, Stat } from "@/components/ui";
import { ruleSetAtivo } from "@/lib/engine";
import { listarCampanhas, listarPedidos, listarSessoes } from "@/lib/store";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function GestorHome() {
  const campanhas = listarCampanhas();
  const sessoes = listarSessoes();
  const pedidos = listarPedidos();

  const kpis = {
    ativas: campanhas.filter((c) => c.status === "ativa").length,
    verba: campanhas.reduce((a, c) => a + c.verbaTotal, 0),
    consumida: campanhas.reduce((a, c) => a + c.verbaConsumida, 0),
    sessoes: sessoes.length,
    pedidos: pedidos.length,
    pendentes: campanhas.reduce(
      (a, c) => a + c.ruleSets.filter((r) => r.status === "em_aprovacao").length,
      0,
    ),
  };

  return (
    <ShellGestor
      secao="campanhas"
      title="Campanhas"
      action={<LinkButton href="/gestor/campanhas/nova">+ Nova campanha</LinkButton>}
    >
      {kpis.pendentes > 0 && (
        <div className="border border-signal-warn/45 bg-signal-warn/10 rounded-md p-5 mb-8 flex flex-wrap items-center gap-4">
          <span className="text-base text-ink-800">
            <strong>{kpis.pendentes}</strong> proposta(s) de regra aguardando aprovação. Nenhuma
            delas está valendo em produção.
          </span>
          <Link
            href="/gestor/aprovacoes"
            className="ml-auto text-sm font-semibold text-vw-deep underline hover:no-underline"
          >
            Revisar →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        <Stat label="Campanhas ativas" value={kpis.ativas} tone="vw" />
        <Stat
          label="Verba total"
          value={`R$ ${(kpis.verba / 1_000_000).toFixed(1)}M`}
          hint={`R$ ${(kpis.consumida / 1_000_000).toFixed(2)}M consumida`}
        />
        <Stat label="Jornadas" value={kpis.sessoes} />
        <Stat label="Pedidos" value={kpis.pedidos} tone="go" />
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {campanhas.map((c) => {
          const rs = ruleSetAtivo(c);
          const pct = c.verbaTotal ? Math.round((c.verbaConsumida / c.verbaTotal) * 100) : 0;
          const daCampanha = sessoes.filter((s) => s.campanhaId === c.id);
          const elegiveis = daCampanha.filter((s) => s.resultado?.tipo === "elegivel").length;
          const pendente = c.ruleSets.some((r) => r.status === "em_aprovacao");

          return (
            <Card key={c.id} className="p-0 overflow-hidden flex flex-col">
              <div
                className={
                  "h-1 " +
                  (c.status === "ativa" ? "bg-signal-go"
                    : c.status === "pausada" ? "bg-signal-warn"
                    : c.status === "encerrada" ? "bg-ink-400"
                    : "bg-ink-300")
                }
              />
              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/gestor/campanhas/${c.id}`}
                    className="display-sm text-xl hover:text-vw-deep transition"
                  >
                    {c.nome}
                  </Link>
                  <Badge tone={c.status === "ativa" ? "go" : c.status === "pausada" ? "warn" : "neutral"}>
                    {c.status}
                  </Badge>
                </div>

                <div className="text-sm text-ink-600 mt-1.5">{c.concessionaria}</div>

                <div className="flex flex-wrap gap-1.5 mt-4">
                  {c.modelos.map((m) => (
                    <span key={m} className="text-xs border hairline rounded-full px-2.5 py-1">
                      {m}
                    </span>
                  ))}
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 mt-5 text-sm">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-ink-600">Cobertura</dt>
                    <dd className="mt-0.5">
                      {c.ufsAlvo.length > 4 ? `${c.ufsAlvo.length} estados` : c.ufsAlvo.join(", ")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-ink-600">Idade</dt>
                    <dd className="mt-0.5">
                      {c.faixasEtarias.length ? c.faixasEtarias.join(", ") : "sem restrição"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-ink-600">Vigência</dt>
                    <dd className="mt-0.5 mono text-xs">
                      {c.vigenciaInicio.slice(5)} → {c.vigenciaFim.slice(5)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-ink-600">Elegíveis</dt>
                    <dd className="mt-0.5">{elegiveis} de {daCampanha.length}</dd>
                  </div>
                </dl>

                <div className="mt-5">
                  <div className="flex justify-between text-xs text-ink-600 mb-1.5">
                    <span>Verba</span>
                    <span className="mono">
                      R$ {(c.verbaConsumida / 1000).toFixed(0)}k / {(c.verbaTotal / 1000).toFixed(0)}k
                    </span>
                  </div>
                  <div className="h-1.5 bg-ink-200 rounded-full overflow-hidden">
                    <div className="h-full bg-vw-deep" style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>

                <div className="mt-auto pt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t hairline">
                  {[
                    { l: "Base", h: `/gestor/campanhas/${c.id}/base` },
                    { l: "Hooks", h: `/gestor/campanhas/${c.id}/hooks` },
                    { l: "Pesquisa", h: `/gestor/campanhas/${c.id}/pesquisa` },
                    { l: `Regras v${rs.versao}`, h: `/gestor/campanhas/${c.id}/regras` },
                    { l: "Simulador", h: `/gestor/campanhas/${c.id}/simulador` },
                  ].map((a) => (
                    <Link
                      key={a.l}
                      href={a.h}
                      className="text-sm text-ink-700 hover:text-vw-deep underline decoration-ink-300 hover:decoration-vw-deep transition"
                    >
                      {a.l}
                    </Link>
                  ))}
                  {pendente && <Badge tone="warn">proposta pendente</Badge>}
                </div>
              </div>
            </Card>
          );
        })}

        <Link
          href="/gestor/campanhas/nova"
          className="border-2 border-dashed border-ink-300 rounded-md p-6 flex flex-col items-center justify-center gap-2 min-h-56
                     text-ink-600 hover:border-vw-deep hover:text-vw-deep transition"
        >
          <span className="text-3xl font-light">+</span>
          <span className="text-sm font-semibold">Nova campanha</span>
        </Link>
      </div>
    </ShellGestor>
  );
}
