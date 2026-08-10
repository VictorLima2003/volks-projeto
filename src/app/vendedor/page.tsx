import { ShellFluxo } from "@/components/ShellFluxo";
import { Card, Stat } from "@/components/ui";
import { usuarioAtual } from "@/lib/identidade-server";
import { listarPedidos, listarSessoes } from "@/lib/store";
import Link from "next/link";
import { BuscaCpfForm } from "./busca-form";
import { maisRecentes, TabelaPedidos } from "./tabela-pedidos";

export const dynamic = "force-dynamic";

/** Quantos pedidos cabem na home antes de ela virar arquivo em vez de resumo. */
const NA_HOME = 10;

export default function VendedorHome() {
  const eu = usuarioAtual();
  /*
   * "Minha carteira" passou a ser a carteira de alguém. Enquanto o pedido
   * guardava o nome do vendedor solto e a tela chamava `listarPedidos()` sem
   * filtro, o título afirmava uma coisa que a tela não fazia: todo vendedor via
   * os pedidos de todos.
   */
  const pedidos = listarPedidos().filter((p) => p.vendedor === eu.id);
  const sessoes = listarSessoes();

  const kpi = {
    liberados: pedidos.filter((p) => p.status === "liberado").length,
    bloqueados: pedidos.filter((p) => p.status === "bloqueado").length,
    concluidos: pedidos.filter((p) => p.status === "concluido").length,
    elegiveis: sessoes.filter((s) => s.resultado?.tipo === "elegivel").length,
  };

  const recentes = maisRecentes(pedidos);
  const naHome = recentes.slice(0, NA_HOME);

  return (
    <ShellFluxo
      area={{ label: "Vendedor", href: "/vendedor" }}
      seletorDeUsuario
      /*
       * O título é o cumprimento. "Vendedor" nomeava a área para quem já sabe em
       * que área está — o cabeçalho e a URL dizem isso — e gastava a linha mais
       * forte da tela repetindo o óbvio. A data foi para a barra da marca pelo
       * mesmo motivo: contexto não precisa da primeira linha do conteúdo.
       */
      title={`Olá, ${eu.nome.split(" ")[0]}`}
    >
      {/* Sem o filete grosso no topo: quatro contadores lado a lado não precisam
          de quatro traços coloridos disputando com o número. */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        <Stat label="Pedidos liberados" value={kpi.liberados} />
        <Stat label="Bloqueados" value={kpi.bloqueados} />
        <Stat label="Concluídos" value={kpi.concluidos} />
        <Stat label="Motoristas elegíveis" value={kpi.elegiveis} />
      </div>

      {/* Só a consulta, de ponta a ponta. O cartão "Regra da vez" ao lado
          decorava o critério em texto fixo — que envelhece na primeira mudança
          de RuleSet e que o vendedor não precisa decorar, já que a consulta
          devolve o motivo por escrito. */}
      <Card className="mb-10">
        <h2 className="text-xl font-semibold tracking-tight mb-2">Consultar motorista</h2>
        <p className="text-sm text-ink-600 mb-5">
          Digite o CPF. Em um passo você vê se pode montar o pedido, e se não pode, por quê.
        </p>
        <BuscaCpfForm />
      </Card>

      <div className="flex flex-wrap items-baseline justify-between gap-4 mb-4">
        <h2 className="text-xl font-semibold tracking-tight">Pedidos da minha carteira</h2>
        {/* Sempre visível, mesmo quando os dez cabem. Condicionar ao estouro
            deixaria `/vendedor/pedidos` inalcançável enquanto a carteira fosse
            pequena — uma tela que só existe depois do décimo primeiro pedido é
            uma tela que ninguém descobre. */}
        <Link
          href="/vendedor/pedidos"
          className="text-sm font-semibold text-vw-deep underline decoration-ink-300 hover:decoration-vw-deep hover:no-underline transition"
        >
          Ver a carteira completa →
        </Link>
      </div>

      <TabelaPedidos pedidos={naHome} />

      {recentes.length > NA_HOME && (
        <p className="text-sm text-ink-600 mt-4">
          Mostrando os {NA_HOME} mais recentes de {recentes.length}.
        </p>
      )}
    </ShellFluxo>
  );
}
