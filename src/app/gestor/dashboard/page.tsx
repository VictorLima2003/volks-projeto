import { ShellGestor } from "@/components/ShellGestor";
import { Badge, Card, Stat, Table, TD, TH, THead, TR } from "@/components/ui";
import { ROTULO_PEDIDO_STATUS } from "@/lib/catalogo";
import { usuarioPorId } from "@/lib/identidade";
import { listarPedidos, listarPesquisas, listarSessoes } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function Dashboard() {
  const sessoes = listarSessoes();
  const pedidos = listarPedidos();
  const pesquisas = listarPesquisas();

  const concluidas = sessoes.filter((s) => s.status === "concluida");
  const elegiveis = concluidas.filter((s) => s.resultado?.efeito === "libera");
  const naoElegiveis = concluidas.filter((s) => s.resultado?.efeito === "recusa");
  const analise = concluidas.filter(
    (s) => s.resultado?.efeito === "segura",
  );
  const abandonos = sessoes.filter((s) => s.status === "em_andamento");
  const vendas = pedidos.filter((p) => p.status === "concluido");
  const bloqueados = pedidos.filter((p) => p.status === "bloqueado");

  const taxaElegibilidade = concluidas.length
    ? Math.round((elegiveis.length / concluidas.length) * 100)
    : 0;
  const pedidosValidos = pedidos.filter((p) => p.status !== "bloqueado");
  const conversao = elegiveis.length
    ? Math.round((pedidosValidos.length / elegiveis.length) * 100)
    : 0;

  // Motivos de não elegibilidade
  const motivos = new Map<string, number>();
  for (const s of naoElegiveis) {
    const m = s.resultado?.motivo ?? "Outro";
    motivos.set(m, (motivos.get(m) ?? 0) + 1);
  }
  const motivosOrdenados = Array.from(motivos.entries()).sort((a, b) => b[1] - a[1]);
  const maxMotivo = motivosOrdenados[0]?.[1] ?? 1;

  // Por concessionária
  const porConc = new Map<string, { pedidos: number; concluidos: number }>();
  for (const p of pedidos) {
    const atual = porConc.get(p.concessionaria) ?? { pedidos: 0, concluidos: 0 };
    atual.pedidos++;
    if (p.status === "concluido") atual.concluidos++;
    porConc.set(p.concessionaria, atual);
  }

  /*
   * Por vendedor. Só existe desde que o pedido passou a guardar o id de quem
   * registrou, carimbado pelo servidor — enquanto era um nome digitado na tela,
   * agrupar por ele daria a soma de quem escreveu o quê.
   */
  const porVendedor = new Map<string, { pedidos: number; concluidos: number }>();
  for (const p of pedidos) {
    const atual = porVendedor.get(p.vendedor) ?? { pedidos: 0, concluidos: 0 };
    atual.pedidos++;
    if (p.status === "concluido") atual.concluidos++;
    porVendedor.set(p.vendedor, atual);
  }

  const funil = [
    { etapa: "Iniciaram a jornada", n: sessoes.length },
    { etapa: "Concluíram a pesquisa", n: concluidas.length },
    { etapa: "Elegíveis", n: elegiveis.length },
    { etapa: "Pedidos registrados", n: pedidos.length },
    { etapa: "Vendas concluídas", n: vendas.length },
  ];
  const maxFunil = funil[0]?.n || 1;

  return (
    <ShellGestor
      title="Indicadores"
    >
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
        <Stat label="Elegíveis" value={elegiveis.length} tone="go" />
        <Stat label="Não elegíveis" value={naoElegiveis.length} tone="stop" />
        <Stat label="Em análise" value={analise.length} tone="warn" />
        <Stat label="Abandonos" value={abandonos.length} />
        <Stat label="Taxa elegibilidade" value={`${taxaElegibilidade}%`} tone="vw" />
        <Stat label="Conversão p/ pedido" value={`${conversao}%`} tone="vw" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-10">
        <Card>
          <h3 className="text-lg font-semibold tracking-tight mb-5">Funil da jornada</h3>
          <div className="space-y-3">
            {funil.map((f) => (
              <div key={f.etapa}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-ink-700">{f.etapa}</span>
                  <span className="mono">{f.n}</span>
                </div>
                <div className="h-2.5 bg-ink-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-vw-blue"
                    style={{ width: `${Math.max((f.n / maxFunil) * 100, f.n > 0 ? 2 : 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold tracking-tight mb-5">Motivos de não elegibilidade</h3>
          {motivosOrdenados.length === 0 ? (
            <div className="text-sm text-ink-600">Nenhum caso registrado ainda.</div>
          ) : (
            <div className="space-y-3">
              {motivosOrdenados.map(([motivo, n]) => (
                <div key={motivo}>
                  <div className="flex justify-between text-sm mb-1 gap-4">
                    <span className="text-ink-700 truncate">{motivo}</span>
                    <span className="mono shrink-0">{n}</span>
                  </div>
                  <div className="h-2.5 bg-ink-200 rounded-full overflow-hidden">
                    <div className="h-full bg-signal-stop" style={{ width: `${(n / maxMotivo) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-10">
        <div>
          <h3 className="text-lg font-semibold tracking-tight mb-4">Por concessionária</h3>
          <Table>
            <THead>
              <tr>
                <TH>Concessionária</TH>
                <TH className="text-right">Pedidos</TH>
                <TH className="text-right">Vendas</TH>
                <TH className="text-right">Conversão</TH>
              </tr>
            </THead>
            <tbody>
              {Array.from(porConc.entries()).map(([nome, v]) => (
                <TR key={nome}>
                  <TD>{nome}</TD>
                  <TD className="text-right mono">{v.pedidos}</TD>
                  <TD className="text-right mono">{v.concluidos}</TD>
                  <TD className="text-right mono">
                    {v.pedidos ? Math.round((v.concluidos / v.pedidos) * 100) : 0}%
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </div>

        <div>
          <h3 className="text-lg font-semibold tracking-tight mb-4">Por vendedor</h3>
          {porVendedor.size === 0 ? (
            <Card><div className="text-sm text-ink-600">Nenhum pedido registrado ainda.</div></Card>
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Vendedor</TH>
                  <TH className="text-right">Pedidos</TH>
                  <TH className="text-right">Vendas</TH>
                </tr>
              </THead>
              <tbody>
                {Array.from(porVendedor.entries()).map(([id, v]) => {
                  const u = usuarioPorId(id);
                  return (
                    <TR key={id}>
                      <TD>
                        <div className="text-sm">{u.nome}</div>
                        <div className="text-xs text-ink-600">{u.concessionaria ?? u.area}</div>
                      </TD>
                      <TD className="text-right mono">{v.pedidos}</TD>
                      <TD className="text-right mono">{v.concluidos}</TD>
                    </TR>
                  );
                })}
              </tbody>
            </Table>
          )}
        </div>

        <div>
          <h3 className="text-lg font-semibold tracking-tight mb-4">Pesquisas</h3>
          <Table>
            <THead>
              <tr>
                <TH>Pesquisa</TH>
                <TH>Status</TH>
                <TH className="text-right">Respostas</TH>
              </tr>
            </THead>
            <tbody>
              {pesquisas.map((p) => (
                <TR key={p.id}>
                  <TD>
                    <div className="text-sm">{p.nome}</div>
                    {p.chamada && <div className="text-xs text-ink-600">{p.chamada}</div>}
                  </TD>
                  <TD><Badge tone={p.status === "ativa" ? "go" : "neutral"}>{p.status}</Badge></TD>
                  <TD className="text-right text-xs">
                    {sessoes.filter((s) => s.pesquisaId === p.id).length}
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </div>
      </div>

      <Card>
        <h3 className="text-lg font-semibold tracking-tight mb-4">Bloqueios operacionais</h3>
        {bloqueados.length === 0 ? (
          <div className="text-sm text-ink-600">Nenhum pedido bloqueado no período.</div>
        ) : (
          <div className="space-y-2">
            {bloqueados.map((p) => (
              <div key={p.id} className="flex items-center justify-between border hairline rounded-sm px-4 py-3.5 text-base">
                <span className="mono text-xs">{p.cpf}</span>
                <span className="text-ink-700">{p.motivo}</span>
                <Badge tone="stop">{ROTULO_PEDIDO_STATUS[p.status]}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </ShellGestor>
  );
}
