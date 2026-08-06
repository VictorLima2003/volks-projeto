import { ShellFluxo } from "@/components/ShellFluxo";
import { Badge, Card, Stat, Table, TD, TH, THead, TR } from "@/components/ui";
import { listarPedidos, listarSessoes } from "@/lib/store";
import { BuscaCpfForm } from "./busca-form";

export const dynamic = "force-dynamic";

export default function VendedorHome() {
  const pedidos = listarPedidos();
  const sessoes = listarSessoes();

  const kpi = {
    liberados: pedidos.filter((p) => p.status === "liberado").length,
    bloqueados: pedidos.filter((p) => p.status === "bloqueado").length,
    concluidos: pedidos.filter((p) => p.status === "concluido").length,
    elegiveis: sessoes.filter((s) => s.resultado?.tipo === "elegivel").length,
  };

  return (
    <ShellFluxo area={{ label: "Vendedor", href: "/vendedor" }} title="Vendedor">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        <Stat label="Pedidos liberados" value={kpi.liberados} tone="go" />
        <Stat label="Bloqueados" value={kpi.bloqueados} tone="stop" />
        <Stat label="Concluídos" value={kpi.concluidos} tone="vw" />
        <Stat label="Motoristas elegíveis" value={kpi.elegiveis} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-10">
        <Card className="lg:col-span-2">
          <h2 className="text-xl font-semibold tracking-tight mb-2">Consultar motorista</h2>
          <p className="text-sm text-ink-600 mb-5">
            Digite o CPF. Em um passo você vê se pode montar o pedido, e se não pode, por quê.
          </p>
          <BuscaCpfForm />
        </Card>
        <Card>
          <h3 className="text-xs font-bold uppercase tracking-widest text-ink-600">Regra da vez</h3>
          <p className="text-sm text-ink-700 mt-3">
            <strong>6 meses ou mais</strong> de atividade na Uber e <strong>500 corridas ou mais</strong> concluídas,
            com conta ativa.
          </p>
          <p className="text-xs text-ink-600 mt-4">
            Você não precisa decorar. O sistema aplica e mostra o motivo.
          </p>
        </Card>
      </div>

      <h2 className="text-xl font-semibold tracking-tight mb-4">Pedidos da minha carteira</h2>
      <Table>
        <THead>
          <tr>
            <TH>Pedido</TH>
            <TH>CPF</TH>
            <TH>Modelo</TH>
            <TH>Concessionária</TH>
            <TH>Criado</TH>
            <TH>Status</TH>
            <TH>Motivo</TH>
          </tr>
        </THead>
        <tbody>
          {pedidos.map((p) => (
            <TR key={p.id}>
              <TD className="mono text-xs">{p.id}</TD>
              <TD className="mono text-xs">{p.cpf}</TD>
              <TD>{p.modelo}</TD>
              <TD className="text-xs text-ink-700">{p.concessionaria}</TD>
              <TD className="mono text-xs text-ink-600">{p.criadoEm.slice(0, 10)}</TD>
              <TD>
                <Badge tone={
                  p.status === "liberado" || p.status === "concluido" ? "go"
                  : p.status === "bloqueado" ? "stop"
                  : "warn"
                }>
                  {p.status.replace("_", " ")}
                </Badge>
              </TD>
              <TD className="text-xs text-ink-700">{p.motivo ?? "-"}</TD>
            </TR>
          ))}
        </tbody>
      </Table>
    </ShellFluxo>
  );
}
