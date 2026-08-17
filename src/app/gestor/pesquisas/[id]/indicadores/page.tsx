import { ShellGestor } from "@/components/ShellGestor";
import { Badge, Card, Stat, Table, TD, TH, THead, TR } from "@/components/ui";
import { nomeDeUsuario } from "@/lib/identidade";
import { exigirUsuarioNaTela } from "@/lib/identidade-server";
import { listarPedidos, listarSessoes, obterPesquisa } from "@/lib/store";
import { desfechosDa } from "@/lib/types";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Indicadores de **uma** pesquisa.
 *
 * A tela geral somava tudo que existia no sistema, e a soma não respondia
 * nenhuma pergunta que alguém faça de verdade: ninguém quer saber a taxa média
 * de duas ofertas em praças diferentes. Quem abre indicadores quer saber como
 * *aquela* pesquisa está indo.
 *
 * Os desfechos vêm do dado da própria pesquisa, e não de uma lista fixa. Por
 * isso a leitura por desfecho é montada em cima de `desfechosDa` e não de
 * "elegível / não elegível": numa pesquisa de satisfação os fins têm outros
 * nomes, e a tela precisa continuar servindo.
 */
export default function IndicadoresDaPesquisa({ params }: { params: { id: string } }) {
  exigirUsuarioNaTela("gestor");
  const pesquisa = obterPesquisa(params.id);
  if (!pesquisa) notFound();

  const sessoes = listarSessoes().filter((s) => s.pesquisaId === pesquisa.id);
  const pedidos = listarPedidos().filter((p) => p.pesquisaId === pesquisa.id);

  const concluidas = sessoes.filter((s) => s.status === "concluida");
  const emAndamento = sessoes.filter((s) => s.status === "em_andamento");
  const liberadas = concluidas.filter((s) => s.resultado?.efeito === "libera");
  const recusadas = concluidas.filter((s) => s.resultado?.efeito === "recusa");
  const vendas = pedidos.filter((p) => p.status === "concluido");

  const taxaConclusao = sessoes.length
    ? Math.round((concluidas.length / sessoes.length) * 100)
    : 0;
  /* Pedido bloqueado não é conversão: ele existe como registro de tentativa. */
  const pedidosValidos = pedidos.filter((p) => p.status !== "bloqueado");
  const conversao = liberadas.length
    ? Math.round((pedidosValidos.length / liberadas.length) * 100)
    : 0;

  /* Um por desfecho declarado, inclusive os que ninguém alcançou — o zero é
     informação: diz que aquele fim está inalcançável ou que ninguém chega lá. */
  const porDesfecho = desfechosDa(pesquisa).map((d) => ({
    ...d,
    n: concluidas.filter((s) => s.resultado?.tipo === d.id).length,
  }));
  const maiorDesfecho = Math.max(1, ...porDesfecho.map((d) => d.n));

  const motivos = new Map<string, number>();
  for (const s of recusadas) {
    const m = s.resultado?.motivo ?? "Outro";
    motivos.set(m, (motivos.get(m) ?? 0) + 1);
  }
  const motivosOrdenados = [...motivos.entries()].sort((a, b) => b[1] - a[1]);
  const maiorMotivo = motivosOrdenados[0]?.[1] ?? 1;

  const porVendedor = new Map<string, { pedidos: number; concluidos: number }>();
  for (const p of pedidos) {
    const atual = porVendedor.get(p.vendedor) ?? { pedidos: 0, concluidos: 0 };
    atual.pedidos++;
    if (p.status === "concluido") atual.concluidos++;
    porVendedor.set(p.vendedor, atual);
  }

  const funil = [
    { etapa: "Iniciaram a jornada", n: sessoes.length },
    { etapa: "Concluíram", n: concluidas.length },
    { etapa: "Saíram liberadas", n: liberadas.length },
    { etapa: "Pedidos registrados", n: pedidos.length },
    { etapa: "Vendas concluídas", n: vendas.length },
  ];
  const maiorFunil = funil[0]?.n || 1;

  return (
    <ShellGestor
      title={pesquisa.nome}
      action={
        <Link
          href={`/gestor/submissoes?pesquisa=${pesquisa.id}`}
          className="text-sm font-semibold text-vw-deep underline hover:no-underline"
        >
          Ver submissões →
        </Link>
      }
    >
      {/* O estado da pesquisa vai em selo acima, e não colorindo o título. */}
      <div className="-mt-4 mb-8 flex flex-wrap items-center gap-3">
        <Badge tone={pesquisa.status === "ativa" ? "go" : "neutral"}>{pesquisa.status}</Badge>
        <Link
          href={`/gestor/pesquisas/${pesquisa.id}`}
          className="text-sm text-ink-700 underline decoration-ink-300 hover:text-vw-deep hover:decoration-vw-deep transition"
        >
          Abrir construtor
        </Link>
        <Link
          href="/gestor/pesquisas"
          className="text-sm text-ink-700 underline decoration-ink-300 hover:text-vw-deep hover:decoration-vw-deep transition"
        >
          Todas as pesquisas
        </Link>
      </div>

      {sessoes.length === 0 ? (
        <Card className="text-base text-ink-700">
          Ninguém respondeu esta pesquisa ainda. Assim que a primeira jornada começar, os números
          aparecem aqui.
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-10">
            <Stat label="Respostas" value={sessoes.length} tone="vw" />
            <Stat label="Concluídas" value={concluidas.length} tone="go" />
            <Stat label="Em andamento" value={emAndamento.length} tone="warn" />
            <Stat label="Taxa de conclusão" value={`${taxaConclusao}%`} />
            <Stat label="Conversão p/ pedido" value={`${conversao}%`} hint="sobre as liberadas" />
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-10">
            <Card>
              <h3 className="text-lg font-semibold tracking-tight mb-5">Por desfecho</h3>
              <div className="space-y-3">
                {porDesfecho.map((d) => (
                  <div key={d.id}>
                    <div className="flex justify-between text-sm mb-1 gap-4">
                      <span className="text-ink-700 truncate">{d.rotulo}</span>
                      <span className="shrink-0">{d.n}</span>
                    </div>
                    <div className="h-2.5 bg-ink-200 rounded-full overflow-hidden">
                      <div
                        className={
                          d.efeito === "libera"
                            ? "h-full bg-signal-go"
                            : d.efeito === "recusa"
                              ? "h-full bg-signal-stop"
                              : "h-full bg-signal-warn"
                        }
                        style={{ width: `${Math.max((d.n / maiorDesfecho) * 100, d.n > 0 ? 2 : 0)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold tracking-tight mb-5">Funil da jornada</h3>
              <div className="space-y-3">
                {funil.map((f) => (
                  <div key={f.etapa}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-ink-700">{f.etapa}</span>
                      <span>{f.n}</span>
                    </div>
                    <div className="h-2.5 bg-ink-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-vw-blue"
                        style={{ width: `${Math.max((f.n / maiorFunil) * 100, f.n > 0 ? 2 : 0)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {motivosOrdenados.length > 0 && (
            <Card className="mb-10">
              <h3 className="text-lg font-semibold tracking-tight mb-5">Motivos de recusa</h3>
              <div className="space-y-3">
                {motivosOrdenados.map(([motivo, n]) => (
                  <div key={motivo}>
                    <div className="flex justify-between text-sm mb-1 gap-4">
                      <span className="text-ink-700 truncate">{motivo}</span>
                      <span className="shrink-0">{n}</span>
                    </div>
                    <div className="h-2.5 bg-ink-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-signal-stop"
                        style={{ width: `${(n / maiorMotivo) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {pedidos.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold tracking-tight mb-4">Pedidos por vendedor</h3>
              <Table>
                <THead>
                  <tr>
                    <TH>Vendedor</TH>
                    <TH className="text-right">Pedidos</TH>
                    <TH className="text-right">Vendas</TH>
                  </tr>
                </THead>
                <tbody>
                  {[...porVendedor.entries()].map(([id, v]) => {
                    const u = nomeDeUsuario(id);
                    return (
                      <TR key={id}>
                        <TD>
                          <div className="text-sm">{u.nome}</div>
                          <div className="text-xs text-ink-600">{u.onde}</div>
                        </TD>
                        <TD className="text-right">{v.pedidos}</TD>
                        <TD className="text-right">{v.concluidos}</TD>
                      </TR>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          )}
        </>
      )}
    </ShellGestor>
  );
}
