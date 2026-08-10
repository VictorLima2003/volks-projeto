import { ShellFluxo } from "@/components/ShellFluxo";
import { usuarioAtual } from "@/lib/identidade-server";
import { listarPedidos } from "@/lib/store";
import { maisRecentes, TabelaPedidos } from "../tabela-pedidos";

export const dynamic = "force-dynamic";

/**
 * A carteira inteira. A home mostra os dez últimos, que é o que responde "o que
 * mexeu hoje?"; quem precisa procurar um pedido antigo vem para cá.
 */
export default function PedidosDaCarteira() {
  const eu = usuarioAtual();
  // Mesmo filtro da home: a carteira é de quem está logado.
  const pedidos = maisRecentes(listarPedidos().filter((p) => p.vendedor === eu.id));

  return (
    <ShellFluxo
      area={{ label: "Vendedor", href: "/vendedor" }}
      seletorDeUsuario
      title="Pedidos da minha carteira"
    >
      <p className="text-base text-ink-700 mb-8">
        {pedidos.length === 1 ? "1 pedido" : `${pedidos.length} pedidos`} na carteira, do mais
        recente para o mais antigo.
      </p>

      <TabelaPedidos pedidos={pedidos} />
    </ShellFluxo>
  );
}
