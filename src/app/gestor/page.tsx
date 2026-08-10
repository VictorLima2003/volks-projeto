import { ShellGestor } from "@/components/ShellGestor";
import { Badge, Card, LinkButton, Stat } from "@/components/ui";
import { ruleSetAtivo } from "@/lib/engine";
import { usuarioAtual } from "@/lib/identidade-server";
import { listarCampanhas, listarPedidos, listarSessoes } from "@/lib/store";
import Link from "next/link";

export const dynamic = "force-dynamic";

/** "2026-06-01" → "01/06". A data ISO fatiada dava "06-01", que se lê ao contrário. */
function diaMes(iso: string) {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

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
      /* O cumprimento é o título, como na home do vendedor. "Campanhas" já está
         aceso na navegação do topo — o h1 repetia a aba selecionada. */
      title={`Olá, ${usuarioAtual().nome.split(" ")[0]}`}
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
            <Card key={c.id} className="flex flex-col">
              {/* Sem filete de estado no topo: o selo ao lado do nome já diz o
                  status, e a faixa colorida repetia a mesma informação com o
                  peso de um título. */}
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

              {/*
               * Lista de rótulo e valor, uma por linha, com filete entre elas.
               * Antes eram quatro pares numa grade 2×2 — e como os valores têm
               * comprimentos muito diferentes ("SP" ao lado de "25-34, 35-44,
               * 45-54"), as células quebravam desalinhadas e o cartão parecia
               * desarrumado. Em linha, cada valor tem a largura que precisar.
               */}
              <dl className="mt-5 text-sm">
                {[
                  {
                    t: "Cobertura",
                    v: c.ufsAlvo.length > 4 ? `${c.ufsAlvo.length} estados` : c.ufsAlvo.join(", "),
                  },
                  {
                    t: "Idade",
                    v: c.faixasEtarias.length ? c.faixasEtarias.join(", ") : "sem restrição",
                  },
                  { t: "Vigência", v: `${diaMes(c.vigenciaInicio)} a ${diaMes(c.vigenciaFim)}` },
                  { t: "Elegíveis", v: `${elegiveis} de ${daCampanha.length}` },
                ].map((linha) => (
                  <div
                    key={linha.t}
                    className="flex items-baseline justify-between gap-6 py-2 border-b hairline last:border-0"
                  >
                    <dt className="text-ink-600 shrink-0">{linha.t}</dt>
                    <dd className="text-right">{linha.v}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-5">
                <div className="flex justify-between text-xs text-ink-600 mb-1.5">
                  <span>Verba</span>
                  <span className="mono">
                    R$ {(c.verbaConsumida / 1000).toFixed(0)}k de {(c.verbaTotal / 1000).toFixed(0)}k
                  </span>
                </div>
                <div className="h-1.5 bg-ink-200 rounded-full overflow-hidden">
                  <div className="h-full bg-vw-deep" style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
              </div>

              <div className="mt-auto pt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t hairline">
                {[
                  { l: "Hooks", h: `/gestor/campanhas/${c.id}/hooks` },
                  { l: "Pesquisa", h: `/gestor/campanhas/${c.id}/pesquisa` },
                  { l: `Regras v${rs.versao}`, h: `/gestor/campanhas/${c.id}/regras` },
                  { l: "Simulador", h: `/gestor/campanhas/${c.id}/pesquisa` },
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
            </Card>
          );
        })}

        <Link
          href="/gestor/campanhas/nova"
          className="border border-dashed border-ink-300 rounded-md p-6 flex flex-col items-center justify-center gap-2 min-h-56
                     text-ink-600 hover:border-vw-deep hover:text-vw-deep transition"
        >
          <span className="text-3xl font-light">+</span>
          <span className="text-sm font-semibold">Nova campanha</span>
        </Link>
      </div>
    </ShellGestor>
  );
}
