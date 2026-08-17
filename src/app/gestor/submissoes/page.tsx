import { AjudaDaTela, ItemAjuda } from "@/components/AjudaDaTela";
import { ShellGestor } from "@/components/ShellGestor";
import { Badge, Card, Stat, Table, TD, TH, THead, TR } from "@/components/ui";
import { rotularFato, mapaDeRotulos } from "@/lib/engine";
import { listarHooks, listarPesquisas, listarSessoes } from "@/lib/store";
import { acharDesfecho, desfechosDa, Pesquisa, SessaoMotorista } from "@/lib/types";
import { podePropor } from "@/lib/identidade";
import { exigirUsuarioNaTela } from "@/lib/identidade-server";
import Link from "next/link";
import { PainelAcesso } from "./painel-acesso";

export const dynamic = "force-dynamic";

/**
 * Todas as submissões, sem exceção — inclusive as que não terminaram.
 *
 * A tela existe porque as outras contam só metade: o painel conta quem passou,
 * a central junta o que ficou parado, e quem abandonou no meio não aparecia em
 * lugar nenhum. Aqui a lista é a lista inteira, e o que se mostra de cada uma é
 * **estado técnico** — se o percurso rodou, falhou ou está em andamento —, não
 * julgamento de negócio.
 *
 * O desfecho aparece com o nome que a pesquisa deu a ele. O sistema não
 * classifica nada: ele registra qual desfecho a lógica do autor produziu.
 */

/** Uma consulta que voltou com erro deixa esta marca nos fatos da sessão. */
function consultasComFalha(sessao: SessaoMotorista): string[] {
  return Object.entries(sessao.externos ?? {})
    .filter(([, fatos]) => fatos?.erro === true)
    .map(([prefixo]) => prefixo);
}

type EstadoTecnico = "em_andamento" | "concluida" | "abandonada";

const ESTADO: Record<EstadoTecnico, { rotulo: string; tom: "go" | "warn" | "neutral" }> = {
  concluida: { rotulo: "percorreu até o fim", tom: "go" },
  em_andamento: { rotulo: "em andamento", tom: "warn" },
  abandonada: { rotulo: "abandonada", tom: "neutral" },
};

/**
 * Meia hora sem tocar é "parou", não "está respondendo".
 *
 * É derivado, não gravado: ninguém marca abandono, e um processo de fundo para
 * carimbar isso seria inventar estado que a tela já consegue ler do relógio.
 * Quem voltar continua de onde parou, e a marca some sozinha.
 */
const LIMITE_PARADA_MS = 30 * 60 * 1000;

function parou(sessao: SessaoMotorista) {
  return (
    sessao.status === "em_andamento" &&
    Date.now() - new Date(sessao.atualizadaEm).getTime() > LIMITE_PARADA_MS
  );
}

export default function Submissoes({
  searchParams,
}: {
  searchParams: { pesquisa?: string; estado?: string; falha?: string };
}) {
  const pesquisas = listarPesquisas();
  const porId = new Map(pesquisas.map((p) => [p.id, p]));
  const rotulos = mapaDeRotulos(listarHooks());

  const todas = [...listarSessoes()].sort((a, b) =>
    b.atualizadaEm.localeCompare(a.atualizadaEm),
  );

  const filtradas = todas.filter((s) => {
    if (searchParams.pesquisa && s.pesquisaId !== searchParams.pesquisa) return false;
    if (searchParams.estado && s.status !== searchParams.estado) return false;
    if (searchParams.falha === "1" && consultasComFalha(s).length === 0) return false;
    return true;
  });

  /* O recorte da tela vira o recorte do CSV: mesmos parâmetros, outra rota. */
  const recorte = new URLSearchParams(
    Object.entries(searchParams).filter(([, v]) => v) as [string, string][],
  ).toString();
  const pesquisaEscolhida = searchParams.pesquisa ? porId.get(searchParams.pesquisa) : undefined;

  const comFalha = todas.filter((s) => consultasComFalha(s).length > 0).length;
  const emAndamento = todas.filter((s) => s.status === "em_andamento").length;
  const paradas = todas.filter(parou).length;

  return (
    <ShellGestor
      title="Submissões"
      ajuda={
        <AjudaDaTela titulo="Submissões">
          <p>
            Toda pessoa que abriu uma pesquisa aparece aqui — inclusive quem parou no meio e quem
            esbarrou numa consulta que falhou.
          </p>
          <ItemAjuda termo="Estado">
            É técnico: o percurso rodou até o fim, está em andamento ou foi abandonado. Não diz se
            a pessoa passou.
          </ItemAjuda>
          <ItemAjuda termo="Desfecho">
            O fim que as regras produziram, com o nome que a pesquisa deu a ele. Vazio quer dizer
            que a pesquisa só coleta, ou que o percurso não chegou ao fim.
          </ItemAjuda>
          <ItemAjuda termo="Consulta falhou">
            Um hook devolveu erro durante o percurso. A submissão continua valendo — o que faltou
            foi o dado daquela fonte.
          </ItemAjuda>
        </AjudaDaTela>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Stat label="Submissões" value={todas.length} tone="vw" />
        <Stat
          label="Em andamento"
          value={emAndamento}
          tone={emAndamento ? "warn" : "neutral"}
          hint={paradas > 0 ? `${paradas} parada(s) há mais de 30 min` : undefined}
        />
        <Stat label="Com consulta falhando" value={comFalha} tone={comFalha ? "stop" : "neutral"} />
        <Stat label="Pesquisas" value={pesquisas.length} />
      </div>

      {/* Filtros como links, não como formulário: o estado fica na URL, e um
          recorte útil se manda por mensagem para outra pessoa. */}
      <div className="flex flex-wrap items-center gap-2 mb-6 text-sm">
        <Filtro href="/gestor/submissoes" ativo={!searchParams.estado && !searchParams.falha && !searchParams.pesquisa}>
          Todas
        </Filtro>
        {(["concluida", "em_andamento"] as EstadoTecnico[]).map((e) => (
          <Filtro
            key={e}
            href={`/gestor/submissoes?estado=${e}`}
            ativo={searchParams.estado === e}
          >
            {ESTADO[e].rotulo}
          </Filtro>
        ))}
        <Filtro href="/gestor/submissoes?falha=1" ativo={searchParams.falha === "1"}>
          consulta falhou
        </Filtro>
      </div>

      {/*
       * Exportar e integrar só aparece com uma pesquisa escolhida.
       *
       * A credencial é da pesquisa — dar acesso "a tudo" seria outra decisão, de
       * outro tamanho, e ninguém pediu. Sem pesquisa escolhida, o CSV do recorte
       * continua disponível pelo botão da lista.
       */}
      {pesquisaEscolhida ? (
        <PainelAcesso
          pesquisaId={pesquisaEscolhida.id}
          pesquisaNome={pesquisaEscolhida.nome}
          tokens={pesquisaEscolhida.tokens ?? []}
          linkCsv={`/api/exportar?${recorte}`}
          podeEditar={podePropor(exigirUsuarioNaTela("gestor"))}
        />
      ) : (
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <a
            href={`/api/exportar${recorte ? `?${recorte}` : ""}`}
            className="h-9 px-4 inline-flex items-center rounded-full border hairline-strong
                       text-sm font-semibold hover:border-vw-deep hover:text-vw-deep transition"
          >
            Baixar CSV deste recorte
          </a>
          <span className="text-sm text-ink-600">
            Para credencial de API, abra o recorte de uma pesquisa.
          </span>
        </div>
      )}

      {filtradas.length === 0 ? (
        <Card className="text-base text-ink-700">
          Nenhuma submissão com este recorte.
        </Card>
      ) : (
        <div className="space-y-3">
          {filtradas.map((s) => (
            <LinhaDaSubmissao
              key={s.id}
              sessao={s}
              pesquisa={porId.get(s.pesquisaId)}
              rotulos={rotulos}
            />
          ))}
        </div>
      )}
    </ShellGestor>
  );
}

function Filtro({
  href,
  ativo,
  children,
}: {
  href: string;
  ativo: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        "px-3 h-8 inline-flex items-center rounded-full border transition " +
        (ativo
          ? "bg-vw-deep text-ink-0 border-vw-deep font-semibold"
          : "border-ink-300 text-ink-700 hover:border-vw-deep")
      }
    >
      {children}
    </Link>
  );
}

function LinhaDaSubmissao({
  sessao,
  pesquisa,
  rotulos,
}: {
  sessao: SessaoMotorista;
  pesquisa?: Pesquisa;
  rotulos: Record<string, string>;
}) {
  const estado = ESTADO[sessao.status as EstadoTecnico] ?? ESTADO.abandonada;
  const falhas = consultasComFalha(sessao);
  const desfecho = sessao.resultado
    ? acharDesfecho(pesquisa ? desfechosDa(pesquisa) : undefined, sessao.resultado.tipo)
    : null;

  const respostas = Object.entries(sessao.respostas ?? {});
  const externos = Object.entries(sessao.externos ?? {});

  return (
    /* `details` em vez de um painel controlado: a linha é conteúdo, não
       ferramenta, e abrir sem JavaScript é o comportamento que já existe no
       navegador. */
    <details className="border hairline rounded-md bg-ink-0 group">
      <summary className="px-5 py-4 flex flex-wrap items-center gap-3 cursor-pointer list-none">
        <Badge tone={estado.tom}>{estado.rotulo}</Badge>
        {parou(sessao) && <Badge tone="neutral">parada</Badge>}
        {falhas.length > 0 && <Badge tone="stop">consulta falhou</Badge>}
        {desfecho && (
          <span className="text-sm text-ink-700">
            desfecho: <strong className="text-ink-900">{desfecho.rotulo}</strong>
          </span>
        )}

        <span className="mono text-sm text-ink-700">{sessao.cpf || "(sem identificador)"}</span>

        <span className="text-sm text-ink-600">
          {pesquisa ? pesquisa.nome : "(pesquisa removida)"}
        </span>

        <span className="ml-auto flex items-center gap-4">
          {sessao.ruleSetVersao && (
            <span className="text-sm text-ink-600">regras v{sessao.ruleSetVersao}</span>
          )}
          <span className="mono text-xs text-ink-600">
            {sessao.atualizadaEm.slice(0, 16).replace("T", " ")}
          </span>
          <span className="text-sm text-ink-600 group-open:hidden">abrir</span>
          <span className="text-sm text-ink-600 hidden group-open:inline">fechar</span>
        </span>
      </summary>

      {/*
       * As entregas aparecem antes das respostas, e em faixa própria.
       *
       * Entrega que falhou é o que alguém do outro lado descobre reclamando que
       * o lead nunca chegou. Enterrada no meio dos dados coletados, a linha que
       * conta isso seria lida depois do problema, e não antes.
       */}
      {(sessao.entregas?.length ?? 0) > 0 && (
        <div className="px-5 pt-4 border-t hairline">
          <h3 className="text-sm font-semibold text-ink-600 mb-3">Entregas</h3>
          <div className="space-y-2">
            {sessao.entregas!.map((e, i) => (
              <div key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                <Badge tone={e.ok ? "go" : "stop"}>{e.ok ? "entregue" : "falhou"}</Badge>
                <span className="font-semibold">{e.destinoNome}</span>
                <span className="text-ink-600">{e.em.slice(0, 16).replace("T", " ")}</span>
                <span className="text-ink-600">{e.duracaoMs}ms</span>
                {e.erro && <span className="text-signal-stop">{e.erro}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-5 pb-5 pt-1 border-t hairline grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-ink-600 mb-3">Respostas</h3>
          {respostas.length === 0 ? (
            <p className="text-sm text-ink-600">Nada respondido ainda.</p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Identificador</TH>
                  <TH>Valor</TH>
                </TR>
              </THead>
              <tbody>
                {respostas.map(([campo, valor]) => (
                  <TR key={campo}>
                    <TD className="mono text-xs">{campo}</TD>
                    <TD>{String(valor)}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-ink-600 mb-3">Consultas</h3>
          {externos.length === 0 ? (
            <p className="text-sm text-ink-600">Nenhuma consulta disparou neste percurso.</p>
          ) : (
            <div className="space-y-3">
              {externos.map(([prefixo, fatos]) => (
                <div key={prefixo} className="border hairline rounded-sm p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="mono text-xs text-ink-700">{prefixo}</span>
                    {fatos?.erro === true ? (
                      <Badge tone="stop">falhou</Badge>
                    ) : fatos?.encontrado === true ? (
                      <Badge tone="go">achou</Badge>
                    ) : (
                      <Badge tone="neutral">não achou</Badge>
                    )}
                  </div>
                  <dl className="text-sm grid grid-cols-2 gap-x-4 gap-y-1">
                    {Object.entries(fatos ?? {})
                      .filter(([k]) => k !== "erro" && k !== "encontrado")
                      .map(([k, v]) => (
                        <div key={k} className="contents">
                          <dt className="text-ink-600 truncate">
                            {rotularFato(`${prefixo}.${k}`, rotulos)}
                          </dt>
                          <dd className="truncate">{String(v)}</dd>
                        </div>
                      ))}
                  </dl>
                </div>
              ))}
            </div>
          )}
        </div>

        {sessao.resultado && (
          <div className="md:col-span-2 border-t hairline pt-4">
            <h3 className="text-sm font-semibold text-ink-600 mb-2">O que a regra decidiu</h3>
            <p className="text-base text-ink-800">{sessao.resultado.motivo}</p>
            <p className="text-sm text-ink-600 mt-1.5">
              Efeito no sistema: <strong>{sessao.resultado.efeito}</strong>
              {sessao.resultado.regraAplicadaId && (
                <> · regra <span className="mono text-xs">{sessao.resultado.regraAplicadaId}</span></>
              )}
            </p>
          </div>
        )}

        {pesquisa && (
          <div className="md:col-span-2">
            <Link
              href={`/gestor/pesquisas/${pesquisa.id}`}
              className="text-sm text-ink-700 hover:text-vw-deep underline decoration-ink-300 hover:decoration-vw-deep transition"
            >
              Abrir a pesquisa →
            </Link>
          </div>
        )}
      </div>
    </details>
  );
}
