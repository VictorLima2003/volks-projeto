import { Badge, Card, Table, TD, TH, THead, TR } from "@/components/ui";
import type { Pedido } from "@/lib/types";

/**
 * Tabela da carteira. Compartilhada entre a home, que mostra os últimos, e
 * `/vendedor/pedidos`, que mostra tudo — duas cópias divergiriam na primeira
 * coluna nova.
 */
export function TabelaPedidos({ pedidos }: { pedidos: Pedido[] }) {
  if (pedidos.length === 0) {
    return (
      <Card>
        <div className="text-base text-ink-600">
          Nenhum pedido na carteira ainda. Consulte um CPF para começar.
        </div>
      </Card>
    );
  }

  return (
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
              <Badge
                tone={
                  p.status === "liberado" || p.status === "concluido"
                    ? "go"
                    : p.status === "bloqueado"
                      ? "stop"
                      : "warn"
                }
              >
                {p.status.replace("_", " ")}
              </Badge>
            </TD>
            <TD className="text-xs text-ink-700">{p.motivo ?? "-"}</TD>
          </TR>
        ))}
      </tbody>
    </Table>
  );
}

/** Mais recentes primeiro — "últimos 10" só quer dizer algo com ordem. */
export function maisRecentes(pedidos: Pedido[]) {
  return [...pedidos].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
}
