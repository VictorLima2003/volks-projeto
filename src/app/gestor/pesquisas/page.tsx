import { AjudaDaTela, ItemAjuda } from "@/components/AjudaDaTela";
import { ShellGestor } from "@/components/ShellGestor";
import { Badge, Card, LinkButton, Stat } from "@/components/ui";
import { contarBlocos, versaoQueDecide } from "@/lib/engine";
import { usuarioAtual } from "@/lib/identidade-server";
import { listarHooks, listarPedidos, listarPesquisas, listarSessoes } from "@/lib/store";
import Link from "next/link";

export const dynamic = "force-dynamic";

/**
 * A porta de entrada do gestor — e a lista de tudo que existe.
 *
 * Era a lista de campanhas, com as pesquisas escondidas atrás delas. Virou uma
 * coisa só quando ficou claro que "campanha" era só um tipo de pesquisa: a que
 * tem verba e vigência. Uma pesquisa de satisfação não tem nem uma nem outra, e
 * manter duas entidades obrigava a criar dois cadastros para publicar uma
 * pergunta.
 */
export default function Pesquisas() {
  const pesquisas = listarPesquisas();
  const sessoes = listarSessoes();
  const pedidos = listarPedidos();

  const kpis = {
    ativas: pesquisas.filter((p) => p.status === "ativa").length,
    sessoes: sessoes.length,
    pedidos: pedidos.length,
    pendentes: pesquisas.reduce(
      (a, p) => a + p.versoes.filter((r) => r.status === "em_revisao").length,
      0,
    ),
  };

  return (
    <ShellGestor
      title={`Olá, ${usuarioAtual().nome.split(" ")[0]}`}
      action={<LinkButton href="/gestor/pesquisas/nova">+ Nova pesquisa</LinkButton>}
      ajuda={
        <AjudaDaTela titulo="Pesquisas">
          <p>
            Uma pesquisa é o questionário que a pessoa percorre — perguntas, consultas às fontes,
            desvios e fins de caminho — mais o que se decide no fim.
          </p>
          <ItemAjuda termo="Regras">
            As condições que decidem o desfecho, guardadas por versão dentro da própria pesquisa.
            São opcionais: quem só coleta, como satisfação, não decide nada.
          </ItemAjuda>
          <ItemAjuda termo="Chamada">
            O título que quem responde lê na tela de entrada. Sem ela, aparece o nome da pesquisa —
            que costuma ser nome interno.
          </ItemAjuda>
          <ItemAjuda termo="Duplicar">
            Duas pesquisas parecidas se resolvem copiando e ajustando o que difere. É mais barato
            do que manter sincronizado o que é comum.
          </ItemAjuda>
        </AjudaDaTela>
      }
    >
      {kpis.pendentes > 0 && (
        <div className="border border-signal-warn/45 bg-signal-warn/10 rounded-md p-5 mb-8 flex flex-wrap items-center gap-4">
          <span className="text-base text-ink-800">
            <strong>{kpis.pendentes}</strong> proposta(s) de regra em revisão. Nenhuma
            delas está valendo em produção.
          </span>
          <Link
            href="/gestor/revisoes"
            className="ml-auto text-sm font-semibold text-vw-deep underline hover:no-underline"
          >
            Revisar →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        <Stat label="Pesquisas no ar" value={kpis.ativas} tone="vw" />
        <Stat label="Jornadas" value={kpis.sessoes} />
        <Stat label="Pedidos" value={kpis.pedidos} tone="go" />
        <Stat label="Fontes de dado" value={listarHooks().length} hint="na biblioteca" />
      </div>

      {pesquisas.length === 0 && (
        <Card className="text-base text-ink-700">
          Nenhuma pesquisa ainda. Crie a primeira e o construtor abre em seguida.
        </Card>
      )}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {pesquisas.map((p) => {
          const contagem = contarBlocos(p.blocos);
          const rs = versaoQueDecide(p.versoes, p.versaoAtivaId);
          const minhas = sessoes.filter((s) => s.pesquisaId === p.id);
          const elegiveis = minhas.filter((s) => s.resultado?.efeito === "libera").length;

          return (
            <Card key={p.id} className="flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={`/gestor/pesquisas/${p.id}`}
                  className="text-lg font-semibold tracking-tight hover:text-vw-deep transition"
                >
                  {p.nome}
                </Link>
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Editada e ainda não publicada: quem olha a lista precisa
                      saber que o que está no ar não é o que está montado. */}
                  {p.blocosRascunho && p.status === "ativa" && (
                    <Badge tone="warn">alterações não publicadas</Badge>
                  )}
                  <Badge tone={p.status === "ativa" ? "go" : p.status === "encerrada" ? "stop" : "neutral"}>
                    {p.status}
                  </Badge>
                </div>
              </div>

              {p.descricao && <p className="mt-2 text-sm text-ink-700 line-clamp-2">{p.descricao}</p>}

              <dl className="mt-5 text-sm divide-y divide-ink-200">
                <div className="py-2 first:pt-0 flex justify-between gap-6">
                  <dt className="text-ink-600">Perguntas</dt>
                  <dd>{contagem.perguntas}</dd>
                </div>
                <div className="py-2 last:pb-0 flex justify-between gap-6">
                  <dt className="text-ink-600">Respostas</dt>
                  <dd>
                    {/* Leva ao recorte desta pesquisa: o número aqui é resumo, e
                        quem clica quer ver quem respondeu. */}
                    <Link
                      href={`/gestor/submissoes?pesquisa=${p.id}`}
                      className="underline decoration-ink-300 hover:decoration-vw-deep hover:text-vw-deep transition"
                    >
                      {minhas.length}
                    </Link>
                    {rs && <span className="text-ink-600"> · {elegiveis} liberadas</span>}
                  </dd>
                </div>
              </dl>

              <div className="mt-auto pt-5 border-t hairline flex flex-wrap items-center gap-x-4 gap-y-2">
                <Link
                  href={`/gestor/pesquisas/${p.id}`}
                  className="text-sm text-ink-700 hover:text-vw-deep underline decoration-ink-300 hover:decoration-vw-deep transition"
                >
                  Construtor
                </Link>
                {rs ? (
                  <Link
                    href={`/gestor/pesquisas/${p.id}`}
                    className="text-sm text-ink-700 hover:text-vw-deep underline decoration-ink-300 hover:decoration-vw-deep transition"
                  >
                    Regras v{rs.versao}
                  </Link>
                ) : (
                  <span className="text-sm text-ink-600">Sem regras · só coleta</span>
                )}
                {/* O link que se compartilha com quem responde. Fora do ar ele
                    leva `previa=1`, senão esta linha da lista mandaria o próprio
                    time para a tela de "não está no ar". */}
                <Link
                  href={
                    p.status === "ativa"
                      ? `/motorista?pesquisa=${p.id}`
                      : `/motorista?pesquisa=${p.id}&previa=1`
                  }
                  className="ml-auto text-sm text-ink-700 hover:text-vw-deep underline decoration-ink-300 hover:decoration-vw-deep transition"
                >
                  {p.status === "ativa" ? "Abrir jornada" : "Ver prévia"}
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </ShellGestor>
  );
}
