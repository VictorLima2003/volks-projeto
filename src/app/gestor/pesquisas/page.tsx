import { AjudaDaTela, ItemAjuda } from "@/components/AjudaDaTela";
import { ShellGestor } from "@/components/ShellGestor";
import { Badge, Card, LinkButton, Stat } from "@/components/ui";
import { contarBlocos, versaoQueDecide } from "@/lib/engine";
import { podePropor } from "@/lib/identidade";
import { exigirUsuarioNaTela } from "@/lib/identidade-server";
import { listarHooks, listarPedidos, listarPesquisas, listarSessoes } from "@/lib/store";
import Link from "next/link";
import { ImportarPesquisa } from "./importar-pesquisa";

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
      title={`Olá, ${exigirUsuarioNaTela("gestor").nome.split(" ")[0]}`}
      action={
        <div className="flex flex-wrap items-center gap-3">
          <ImportarPesquisa podeEditar={podePropor(exigirUsuarioNaTela("gestor"))} />
          <LinkButton href="/gestor/pesquisas/nova">+ Nova pesquisa</LinkButton>
        </div>
      }
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

      {/*
       * Lista, e não grade de cartões.
       *
       * Os cartões empilhavam nome, descrição, dois números e quatro links cada,
       * e três deles lado a lado já não cabiam sem cortar texto. O que se faz
       * aqui é comparar pesquisas — quantas perguntas, quantas respostas — e
       * comparar pede coluna alinhada, não caixas soltas: com os números na
       * mesma vertical, a leitura de cima a baixo é imediata.
       */}
      <div className="border hairline rounded-md overflow-hidden">
        {pesquisas.map((p, i) => {
          const contagem = contarBlocos(p.blocos);
          const rs = versaoQueDecide(p.versoes, p.versaoAtivaId);
          const respostas = sessoes.filter((s) => s.pesquisaId === p.id).length;

          return (
            <div
              key={p.id}
              className={`flex flex-wrap items-center gap-x-6 gap-y-4 px-5 py-4 ${
                i > 0 ? "border-t hairline" : ""
              }`}
            >
              <div className="min-w-56 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/gestor/pesquisas/${p.id}`}
                    className="text-base font-semibold tracking-tight hover:text-vw-deep transition"
                  >
                    {p.nome}
                  </Link>
                  {/* Editada e ainda não publicada: quem olha a lista precisa
                      saber que o que está no ar não é o que está montado. */}
                  {p.blocosRascunho && p.status === "ativa" && (
                    <Badge tone="warn">alterações não publicadas</Badge>
                  )}
                  <Badge
                    tone={p.status === "ativa" ? "go" : p.status === "encerrada" ? "stop" : "neutral"}
                  >
                    {p.status}
                  </Badge>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                  {!rs && <span className="text-sm text-ink-600">Sem regras · só coleta</span>}
                  {/* O link que se compartilha com quem responde. Fora do ar ele
                      leva `previa=1`, senão esta linha da lista mandaria o próprio
                      time para a tela de "não está no ar". */}
                  <Link
                    href={
                      p.status === "ativa"
                        ? `/motorista?pesquisa=${p.id}`
                        : `/motorista?pesquisa=${p.id}&previa=1`
                    }
                    className="text-sm text-ink-700 hover:text-vw-deep underline decoration-ink-300 hover:decoration-vw-deep transition"
                  >
                    {p.status === "ativa" ? "Abrir jornada" : "Ver prévia"}
                  </Link>
                </div>
              </div>

              {/* Rótulo em cima do número, e não ao lado: assim a coluna
                  continua legível quando a linha quebra no celular. */}
              <div className="w-24 shrink-0">
                <div className="text-xs text-ink-600">Perguntas</div>
                <div className="text-lg font-semibold tabular-nums">{contagem.perguntas}</div>
              </div>

              <div className="w-24 shrink-0">
                <div className="text-xs text-ink-600">Respostas</div>
                {/* O número leva ao recorte desta pesquisa: quem clica num total
                    quer ver do que ele é feito. */}
                <Link
                  href={`/gestor/submissoes?pesquisa=${p.id}`}
                  className="text-lg font-semibold tabular-nums underline decoration-ink-300 hover:text-vw-deep hover:decoration-vw-deep transition"
                >
                  {respostas}
                </Link>
              </div>

              {/*
               * Construir é o que se vem fazer aqui; indicadores é consulta.
               *
               * Os dois no mesmo tamanho faziam a linha oferecer duas portas de
               * igual peso, e a mais usada não era a que chamava. Agora o
               * primário leva ao construtor e a leitura vai numa pílula
               * menor, ao lado.
               *
               * Os dois são escritos à mão em vez de `LinkButton` com
               * `className`: o `cn` daqui é concatenação simples, então
               * `h-12` e `h-9` na mesma string deixam a altura por conta da
               * ordem da folha gerada, e não do que se pediu.
               *
               * Mesma altura, e o que distingue é o preenchimento: numa lista de
               * linhas repetidas, dois tamanhos diferentes por linha viram
               * degrau visual a cada item, e o olho passa a ler o degrau em vez
               * do nome da pesquisa.
               */}
              <div className="ml-auto flex shrink-0 items-center gap-3">
                <Link
                  href={`/gestor/pesquisas/${p.id}/indicadores`}
                  className="inline-flex h-9 items-center rounded-full border hairline px-4
                             text-sm text-ink-800 transition
                             hover:border-vw-deep hover:text-vw-deep"
                >
                  Indicadores
                </Link>
                <Link
                  href={`/gestor/pesquisas/${p.id}`}
                  className="inline-flex h-9 items-center rounded-full bg-vw-deep px-4
                             text-sm text-ink-0 transition hover:bg-ink-800"
                >
                  Construtor
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </ShellGestor>
  );
}
